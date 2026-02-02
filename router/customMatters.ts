import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import {
  matterFilterSchema,
  matterSchema,
  paginatedMattersSchema,
  updateCustomMatterFieldsSchema,
} from "@/schema/customMatterSchema";
<<<<<<< Updated upstream
=======
import { checkMatterChangesAndNotify } from "@/lib/notifications/notification-service";
import { fetchMatterDetail } from "@/lib/services/docketwise-matters";
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const skip = (page - 1) * perPage;

    const where: Prisma.mattersWhereInput = {
      userId: context.user.id,
    };
=======
    
    // Build Prisma WHERE clause with filters
    const where: Prisma.mattersWhereInput = {
      userId: context.user.id,
      archived: false,
      discardedAt: null,
    };
    
    // Search filter - search across multiple fields
    if (input.search) {
      const searchLower = input.search.toLowerCase();
      where.OR = [
        { title: { contains: searchLower, mode: 'insensitive' } },
        { clientName: { contains: searchLower, mode: 'insensitive' } },
        { description: { contains: searchLower, mode: 'insensitive' } },
        { status: { contains: searchLower, mode: 'insensitive' } },
        { matterType: { contains: searchLower, mode: 'insensitive' } },
        { assignees: { contains: searchLower, mode: 'insensitive' } },
      ];
    }
    
    // Billing status filter
    if (input.billingStatus) {
      where.billingStatus = input.billingStatus;
    }
    
    // Assignee filter - database level
    if (input.assignees) {
      where.assignees = { contains: input.assignees, mode: 'insensitive' };
    }
    
    // Matter type filter
    if (input.matterType) {
      where.matterType = input.matterType;
    }
    
    // Status filter - database level
    if (input.status) {
      where.OR = where.OR || [];
      where.OR.push(
        { status: { equals: input.status, mode: 'insensitive' } },
        { statusForFiling: { equals: input.status, mode: 'insensitive' } }
      );
    }
    
    // Date range filter
    if (input.dateFrom || input.dateTo) {
      where.docketwiseCreatedAt = {};
      if (input.dateFrom) {
        where.docketwiseCreatedAt.gte = new Date(input.dateFrom);
      }
      if (input.dateTo) {
        const toDate = new Date(input.dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.docketwiseCreatedAt.lte = toDate;
      }
    }

    // Has deadline filter
    if (input.hasDeadline !== undefined) {
      where.estimatedDeadline = input.hasDeadline ? { not: null } : null;
    }

    // Fetch from database with all filters applied
    const allMatters = await prisma.matters.findMany({
      where,
      select: {
        docketwiseId: true,
        docketwiseCreatedAt: true,
        docketwiseUpdatedAt: true,
        title: true,
        description: true,
        matterType: true,
        matterTypeId: true,
        status: true,
        statusId: true,
        statusForFiling: true,
        statusForFilingId: true,
        clientName: true,
        clientId: true,
        teamId: true,
        assignees: true,
        docketwiseUserIds: true,
        openedAt: true,
        closedAt: true,
        assignedDate: true,
        estimatedDeadline: true,
        actualDeadline: true,
        billingStatus: true,
        totalHours: true,
        flatFee: true,
        customNotes: true,
        lastSyncedAt: true,
        isStale: true,
        isEdited: true,
        editedBy: true,
        editedAt: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        archived: true,
        editedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { docketwiseCreatedAt: "desc" },
    });
    
    const totalMatters = allMatters.length;
    const totalPages = Math.ceil(totalMatters / perPage);
    const paginatedMatters = allMatters.slice((page - 1) * perPage, page * perPage);
>>>>>>> Stashed changes

    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: "insensitive" } },
        { clientName: { contains: input.search, mode: "insensitive" } },
      ];
    }

    if (input.billingStatus) {
      where.billingStatus = input.billingStatus;
    }

    if (input.paralegalAssigned) {
      where.paralegalAssigned = input.paralegalAssigned;
    }

    if (input.isStale !== undefined) {
      where.isStale = input.isStale;
    }

    if (input.hasDeadline !== undefined) {
      if (input.hasDeadline) {
        where.estimatedDeadline = { not: null };
      } else {
        where.estimatedDeadline = null;
      }
    }

<<<<<<< Updated upstream
    const [matters, total] = await Promise.all([
      prisma.matters.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { updatedAt: "desc" },
        include: {
          editedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.matters.count({ where }),
    ]);

    return {
      data: matters,
      pagination: {
        total,
=======
    // Calculate dynamic deadline and time spent for each matter
    const mattersWithDeadlines = paginatedMatters.map((matter) => {
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
        id: matter.docketwiseId.toString(),
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
        assignee: null,
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
        isEdited: matter.isEdited,
        editedBy: matter.editedBy,
        editedAt: matter.editedAt,
        editedByUser: matter.editedByUser,
        userId: matter.userId,
        createdAt: matter.createdAt,
        updatedAt: matter.updatedAt,
        calculatedDeadline,
        isPastEstimatedDeadline,
        totalHoursElapsed,
        notes: null,
      };
    });

    return {
      data: mattersWithDeadlines,
      pagination: {
        total: totalMatters,
>>>>>>> Stashed changes
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
