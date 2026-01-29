import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import {
  matterFilterSchema,
  matterSchema,
  paginatedMattersSchema,
  updateCustomMatterFieldsSchema,
} from "@/schema/customMatterSchema";
import { checkMatterChangesAndNotify } from "@/lib/notifications/notification-service";
import { fetchMattersRealtime, fetchMatterDetail } from "@/lib/services/docketwise-matters";
import { ORPCError } from "@orpc/server";
import * as z from "zod";


// Get Custom Matters
export const getCustomMatters = authorized
  .route({
    method: "GET",
    path: "/custom-matters",
    summary: "Get custom matters with filters",
    tags: ["Custom Matters"],
  })
  .input(matterFilterSchema)
  .output(paginatedMattersSchema)
  .handler(async ({ input, context }) => {
    const page = input.page || 1;
    const perPage = 50;
    
    // Check if any filters are applied (excluding pagination)
    const hasFilters = input.search || input.billingStatus || input.assignees || 
                       input.matterType || input.status || input.dateFrom || 
                       input.dateTo || input.hasDeadline !== undefined;
    
    // When filters are applied, we need to fetch more data to find matches
    // because the Docketwise API doesn't support server-side filtering
    const fetchPerPage = hasFilters ? 200 : perPage;
    const fetchPage = hasFilters ? Math.ceil(page / (fetchPerPage / perPage)) : page;
    
    const result = await fetchMattersRealtime({
      page: fetchPage,
      perPage: fetchPerPage,
      userId: context.user.id,
    });

    // Load matter types for deadline calculation
    const matterTypes = await prisma.matterTypes.findMany({
      select: {
        docketwiseId: true,
        estimatedDays: true,
      },
    });

    const matterTypeEstDaysMap = new Map<number, number>();
    for (const mt of matterTypes) {
      if (mt.estimatedDays) {
        matterTypeEstDaysMap.set(mt.docketwiseId, mt.estimatedDays);
      }
    }

    // Apply client-side filters and calculate deadlines
    const filteredMatters = result.data.filter((matter) => {
      // Enhanced search filter - search by title, client, description, status, matter type, or assignee
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        const matchTitle = matter.title?.toLowerCase().includes(searchLower);
        const matchClient = matter.clientName?.toLowerCase().includes(searchLower);
        const matchDescription = matter.description?.toLowerCase().includes(searchLower);
        const matchStatus = matter.status?.toLowerCase().includes(searchLower);
        const matchMatterType = matter.matterType?.toLowerCase().includes(searchLower);
        const matchAssignee = matter.assignee?.name?.toLowerCase().includes(searchLower);
        const matchAssignees = matter.assignees?.toLowerCase().includes(searchLower);
        
        if (!matchTitle && !matchClient && !matchDescription && !matchStatus && !matchMatterType && !matchAssignee && !matchAssignees) {
          return false;
        }
      }

      // Billing status filter
      if (input.billingStatus) {
        if (matter.billingStatus !== input.billingStatus) return false;
      }

      // Assignee filter - check both assignee relation and legacy assignees field
      if (input.assignees) {
        const assigneesLower = input.assignees.toLowerCase();
        const matchAssigneeName = matter.assignee?.name?.toLowerCase().includes(assigneesLower);
        const matchAssigneeEmail = matter.assignee?.email?.toLowerCase().includes(assigneesLower);
        const matchLegacyAssignees = matter.assignees?.toLowerCase().includes(assigneesLower);
        
        if (!matchAssigneeName && !matchAssigneeEmail && !matchLegacyAssignees) return false;
      }

      // Matter type filter
      if (input.matterType) {
        if (matter.matterType !== input.matterType) return false;
      }

      // Status filter - match the matter's actual current status
      if (input.status) {
        const filterStatus = input.status.toLowerCase().trim();
        const matterStatus = (matter.status || "").toLowerCase().trim();
        const matterStatusForFiling = (matter.statusForFiling || "").toLowerCase().trim();
        
        // Match if either status field matches the filter
        if (matterStatus !== filterStatus && matterStatusForFiling !== filterStatus) {
          return false;
        }
      }

      // Date range filter (docketwiseCreatedAt)
      if (input.dateFrom || input.dateTo) {
        if (!matter.docketwiseCreatedAt) return false;
        
        const createdAt = new Date(matter.docketwiseCreatedAt);
        if (isNaN(createdAt.getTime()) || createdAt.getFullYear() <= 1970) return false;
        
        if (input.dateFrom) {
          const fromDate = new Date(input.dateFrom);
          if (createdAt < fromDate) return false;
        }
        
        if (input.dateTo) {
          const toDate = new Date(input.dateTo);
          toDate.setHours(23, 59, 59, 999); // End of day
          if (createdAt > toDate) return false;
        }
      }

      // Has deadline filter
      if (input.hasDeadline !== undefined) {
        if (input.hasDeadline && !matter.estimatedDeadline) return false;
        if (!input.hasDeadline && matter.estimatedDeadline) return false;
      }

      return true;
    });

    // Calculate dynamic deadline and time spent for each matter
    const mattersWithDeadlines = filteredMatters.map((matter) => {
      let calculatedDeadline: Date | null = null;
      let isPastEstimatedDeadline = false;
      let totalHoursElapsed: number | undefined = undefined;
      
      // Calculate deadline based on docketwiseCreatedAt + estimatedDays
      if (matter.docketwiseCreatedAt && matter.matterTypeId) {
        const createdAt = new Date(matter.docketwiseCreatedAt);
        if (!isNaN(createdAt.getTime()) && createdAt.getFullYear() > 1970) {
          const estDays = matterTypeEstDaysMap.get(matter.matterTypeId);
          if (estDays && estDays > 0) {
            const targetDate = new Date(createdAt);
            targetDate.setDate(targetDate.getDate() + estDays);
            
            if (targetDate.getFullYear() > 1970) {
              calculatedDeadline = targetDate;
              isPastEstimatedDeadline = new Date() > calculatedDeadline;
            }
          }
        }
      }

      // Calculate time spent: assignedDate to today (in hours)
      if (matter.assignedDate) {
        const assignedDate = new Date(matter.assignedDate);
        if (!isNaN(assignedDate.getTime()) && assignedDate.getFullYear() > 1970) {
          const now = new Date();
          const diffMs = now.getTime() - assignedDate.getTime();
          totalHoursElapsed = Math.floor(diffMs / (1000 * 60 * 60)); // Convert to hours
        }
      }

      // Sanitize estimatedDeadline - if it's 1970, treat as null
      let estimatedDeadline = matter.estimatedDeadline;
      if (estimatedDeadline) {
        const date = new Date(estimatedDeadline);
        if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
          estimatedDeadline = null;
        }
      }
      
      return {
        id: matter.id,
        docketwiseId: matter.docketwiseId,
        docketwiseCreatedAt: matter.docketwiseCreatedAt,
        docketwiseUpdatedAt: matter.docketwiseUpdatedAt,
        title: matter.title,
        description: matter.description,
        matterType: matter.matterType,
        matterTypeId: matter.matterTypeId,
        status: matter.status,
        statusId: matter.statusId,
        statusForFiling: matter.statusForFiling,
        statusForFilingId: matter.statusForFilingId,
        clientName: matter.clientName,
        clientId: matter.clientId,
        teamId: matter.teamId,
        assignee: matter.assignee ? {
          id: matter.assignee.id,
          name: matter.assignee.name,
          email: matter.assignee.email,
          firstName: matter.assignee.firstName,
          lastName: matter.assignee.lastName,
          fullName: matter.assignee.fullName,
          teamType: matter.assignee.teamType,
          title: matter.assignee.title,
          isActive: matter.assignee.isActive,
        } : null,
        assignees: matter.assignees,
        docketwiseUserIds: matter.docketwiseUserIds,
        openedAt: matter.openedAt,
        closedAt: matter.closedAt,
        assignedDate: matter.assignedDate,
        estimatedDeadline,
        actualDeadline: matter.actualDeadline,
        billingStatus: matter.billingStatus,
        totalHours: matter.totalHours,
        flatFee: matter.flatFee,
        customNotes: matter.customNotes,
        lastSyncedAt: matter.lastSyncedAt,
        isStale: matter.isStale,
        archived: matter.archived,
        priorityDate: matter.priorityDate,
        isEdited: matter.isEdited,
        editedBy: matter.editedBy,
        editedAt: matter.editedAt,
        editedByUser: matter.editedByUser ? {
          name: matter.editedByUser.name,
          email: matter.editedByUser.email,
        } : null,
        userId: matter.userId,
        createdAt: matter.createdAt,
        updatedAt: matter.updatedAt,
        calculatedDeadline,
        isPastEstimatedDeadline,
        totalHoursElapsed,
        notes: matter.notes,
      };
    });

    // When filters are applied, paginate the filtered results
    // Otherwise use the API's pagination
    let paginatedData = mattersWithDeadlines;
    let totalForPagination = result.total;
    let totalPages = Math.ceil(result.total / perPage);
    
    if (hasFilters) {
      // Client-side pagination of filtered results
      const startIndex = (page - 1) * perPage % fetchPerPage;
      const endIndex = startIndex + perPage;
      paginatedData = mattersWithDeadlines.slice(startIndex, endIndex);
      totalForPagination = filteredMatters.length;
      totalPages = Math.max(1, Math.ceil(totalForPagination / perPage));
    }
    
    const finalResult = {
      data: paginatedData,
      pagination: {
        total: totalForPagination,
        page,
        perPage,
        totalPages,
      },
    };
        
    return finalResult;
  });

// Get Custom Matter by ID (from local DB)
export const getCustomMatterById = authorized
  .route({
    method: "GET",
    path: "/custom-matters/{id}",
    summary: "Get custom matter by ID",
    tags: ["Custom Matters"],
  })
  .input(z.object({ id: z.string() }))
  .output(matterSchema)
  .handler(async ({ input, context }) => {
    const matter = await prisma.matters.findUnique({
      where: { id: input.id },
      include: {
        editedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            docketwiseId: true,
            fullName: true,
            email: true,
            firstName: true,
            lastName: true,
            teamType: true,
            title: true,
            isActive: true,
          },
        },
      },
    });

    if (!matter || matter.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }

    // Transform assignee object to match schema
    const transformedMatter = {
      ...matter,
      assignee: matter.assignee ? {
        id: matter.assignee.docketwiseId,
        name: matter.assignee.fullName || matter.assignee.email,
        email: matter.assignee.email,
        firstName: matter.assignee.firstName,
        lastName: matter.assignee.lastName,
        fullName: matter.assignee.fullName || matter.assignee.email,
        teamType: matter.assignee.teamType,
        title: matter.assignee.title,
        isActive: matter.assignee.isActive,
      } : null,
    };

    return transformedMatter;
  });

// Get Matter Detail by Docketwise ID (fetch from API on-demand)
export const getMatterDetailByDocketwiseId = authorized
  .route({
    method: "GET",
    path: "/custom-matters/detail/{docketwiseId}",
    summary: "Get matter detail from Docketwise API on-demand",
    tags: ["Custom Matters"],
  })
  .input(z.object({ docketwiseId: z.number() }))
  .output(matterSchema)
  .handler(async ({ input, context }) => {
    try {
      const matter = await fetchMatterDetail(input.docketwiseId, context.user.id);
      return matter;
    } catch (error) {
      console.error("[MATTER-DETAIL] Error fetching matter:", error);
      throw new ORPCError("NOT_FOUND", {
        message: error instanceof Error ? error.message : "Matter not found",
      });
    }
  });

// Update Custom Matter Fields
export const updateCustomMatter = authorized
  .route({
    method: "PATCH",
    path: "/custom-matters/:id",
    summary: "Update custom matter fields",
    tags: ["Custom Matters"],
  })
  .input(updateCustomMatterFieldsSchema)
  .output(matterSchema)
  .handler(async ({ input, context }) => {
    const { id, ...updateData } = input;

    const existingMatter = await prisma.matters.findUnique({
      where: { id, userId: context.user.id },
    });

    if (!existingMatter) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }

    // Filter out undefined values - only include fields that were explicitly set
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    // Auto-set assignedDate when assignee is being set and no assignedDate exists
    const hasAssignee = updateData.assignees || updateData.teamId;
    if (hasAssignee && !existingMatter.assignedDate) {
      filteredUpdateData.assignedDate = new Date();
    }

    console.log("[MATTER UPDATE] Input:", JSON.stringify(input, null, 2));
    console.log("[MATTER UPDATE] Filtered data:", JSON.stringify(filteredUpdateData, null, 2));

    const updatedMatter = await prisma.matters.update({
      where: { id },
      data: {
        ...filteredUpdateData,
        isEdited: true,
        editedBy: context.user.id,
        editedAt: new Date(),
      },
      include: {
        editedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            docketwiseId: true,
            fullName: true,
            email: true,
            firstName: true,
            lastName: true,
            teamType: true,
            title: true,
            isActive: true,
          },
        },
      },
    });


    // Check for field changes and send notifications
    checkMatterChangesAndNotify({
      matterId: updatedMatter.id,
      matterTitle: updatedMatter.title,
      clientName: updatedMatter.clientName,
      matterType: updatedMatter.matterType,
      paralegalAssigned: updatedMatter.assignees,
      // Status changes (workflow stage)
      workflowStage: updatedMatter.status,
      oldWorkflowStage: existingMatter.status,
      // Billing status changes
      billingStatus: updatedMatter.billingStatus,
      oldBillingStatus: existingMatter.billingStatus,
      // Estimated deadline changes
      estimatedDeadline: updatedMatter.estimatedDeadline,
      oldEstimatedDeadline: existingMatter.estimatedDeadline,
      // Actual deadline changes
      actualDeadline: updatedMatter.actualDeadline,
      oldActualDeadline: existingMatter.actualDeadline,
    }).catch((err) => {
      console.error("[NOTIFICATION] Failed to check matter changes:", err);
    });

    // Transform assignee object to match schema
    const transformedMatter = {
      ...updatedMatter,
      assignee: updatedMatter.assignee ? {
        id: updatedMatter.assignee.docketwiseId,
        name: updatedMatter.assignee.fullName || updatedMatter.assignee.email,
        email: updatedMatter.assignee.email,
        firstName: updatedMatter.assignee.firstName,
        lastName: updatedMatter.assignee.lastName,
        fullName: updatedMatter.assignee.fullName || updatedMatter.assignee.email,
        teamType: updatedMatter.assignee.teamType,
        title: updatedMatter.assignee.title,
        isActive: updatedMatter.assignee.isActive,
      } : null,
    };

    return transformedMatter;
  });

// Create Custom Matter (local only, with isEdited flag)
export const createCustomMatter = authorized
  .route({
    method: "POST",
    path: "/custom-matters",
    summary: "Create a new custom matter",
    tags: ["Custom Matters"],
  })
  .input(
    z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      clientName: z.string().optional(),
      clientId: z.number().optional(),
      matterType: z.string().optional(),
      matterTypeId: z.number().optional(),
      status: z.string().optional(),           // Workflow stage
      statusForFiling: z.string().optional(),  // Status for filing
      assignees: z.string().optional(),
      assignedDate: z.coerce.date().optional(),
      estimatedDeadline: z.coerce.date().optional(),
      billingStatus: z.enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"]).optional(),
      customNotes: z.string().optional(),
    })
  )
  .output(matterSchema)
  .handler(async ({ input, context }) => {
    // Generate a unique docketwiseId for local matters (negative to distinguish from real ones)
    const localId = -Math.floor(Date.now() / 1000);

    const matter = await prisma.matters.create({
      data: {
        docketwiseId: localId,
        title: input.title,
        description: input.description,
        clientName: input.clientName,
        clientId: input.clientId,
        matterType: input.matterType,
        matterTypeId: input.matterTypeId,
        status: input.status,
        statusForFiling: input.statusForFiling,
        assignees: input.assignees,
        assignedDate: input.assignedDate,
        estimatedDeadline: input.estimatedDeadline,
        billingStatus: input.billingStatus,
        customNotes: input.customNotes,
        userId: context.user.id,
        isEdited: true,
        editedBy: context.user.id,
        editedAt: new Date(),
      },
      include: {
        editedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            docketwiseId: true,
            fullName: true,
            email: true,
            firstName: true,
            lastName: true,
            teamType: true,
            title: true,
            isActive: true,
          },
        },
      },
    });


    // Check if new matter has a deadline and send notifications
    if (input.estimatedDeadline) {
      checkMatterChangesAndNotify({
        matterId: matter.id,
        matterTitle: matter.title,
        clientName: matter.clientName,
        matterType: matter.matterType,
        estimatedDeadline: matter.estimatedDeadline,
        oldEstimatedDeadline: null,
      }).catch((err) => {
        console.error("[NOTIFICATION] Failed to check new matter deadline:", err);
      });
    }

    // Transform assignee object to match schema
    const transformedMatter = {
      ...matter,
      assignee: matter.assignee ? {
        id: matter.assignee.docketwiseId,
        name: matter.assignee.fullName || matter.assignee.email,
        email: matter.assignee.email,
        firstName: matter.assignee.firstName,
        lastName: matter.assignee.lastName,
        fullName: matter.assignee.fullName || matter.assignee.email,
        teamType: matter.assignee.teamType,
        title: matter.assignee.title,
        isActive: matter.assignee.isActive,
      } : null,
    };

    return transformedMatter;
  });

// Delete Custom Matter
export const deleteCustomMatter = authorized
  .route({
    method: "DELETE",
    path: "/custom-matters/{id}",
    summary: "Delete custom matter",
    tags: ["Custom Matters"],
  })
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input, context }) => {
    const matter = await prisma.matters.findUnique({
      where: { id: input.id },
    });

    if (!matter || matter.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }

    await prisma.matters.delete({
      where: { id: input.id },
    });


    return { success: true };
  });
