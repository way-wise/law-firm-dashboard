import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  matterFilterSchema,
  matterSchema,
  paginatedMattersSchema,
  updateCustomMatterFieldsSchema,
} from "@/schema/customMatterSchema";
import { checkMatterChangesAndNotify } from "@/lib/notifications/notification-service";
import { fetchMatterDetail } from "@/lib/services/docketwise-matters";
import { getMatterActivityStatus } from "@/lib/utils/matter-status";
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
    const perPage = 20;
    
    // Build database query filters
    type WhereClause = {
      userId: string;
      discardedAt: null;
      billingStatus?: string;
      matterType?: { contains: string; mode: Prisma.QueryMode };
      status?: { contains: string; mode: Prisma.QueryMode };
      deadline?: { not: null } | null;
      docketwiseCreatedAt?: { gte?: Date; lte?: Date };
      docketwiseUpdatedAt?: { lte: Date };
      statusId?: { in: number[] };
      statusForFilingId?: { in: number[] };
      OR?: Array<{
        title?: { contains: string; mode: Prisma.QueryMode };
        clientName?: { contains: string; mode: Prisma.QueryMode };
        description?: { contains: string; mode: Prisma.QueryMode };
        status?: { contains: string; mode: Prisma.QueryMode };
        matterType?: { contains: string; mode: Prisma.QueryMode };
        assignees?: { contains: string; mode: Prisma.QueryMode };
        statusId?: { in: number[] };
        statusForFilingId?: { in: number[] };
      }>;
    };
    
    const whereClause: WhereClause = {
      userId: context.user.id,
      discardedAt: null,
    };

    // Search filter (search across multiple fields)
    if (input.search) {
      whereClause.OR = [
        { title: { contains: input.search, mode: 'insensitive' } },
        { clientName: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
        { status: { contains: input.search, mode: 'insensitive' } },
        { matterType: { contains: input.search, mode: 'insensitive' } },
        { assignees: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    // Billing status filter
    if (input.billingStatus) {
      whereClause.billingStatus = input.billingStatus;
    }

    // Matter type filter
    if (input.matterType) {
      whereClause.matterType = { contains: input.matterType, mode: 'insensitive' };
    }

    // Status filter
    if (input.status) {
      whereClause.status = { contains: input.status, mode: 'insensitive' };
    }

    // Assignee filter - match by assignees string or teamId
    if (input.assignees) {
      // Filter can be assignee name or teamId
      const assigneeFilter = input.assignees;
      whereClause.OR = whereClause.OR || [];
      whereClause.OR.push(
        { assignees: { contains: assigneeFilter, mode: 'insensitive' } }
      );
    }

    // Status Group Filter
    if (input.statusGroupId && input.statusGroupId !== 'all') {
      if (input.statusGroupId === 'stale') {
        // Stale filter: matters not updated in staleMeasurementDays
        const syncSettings = await prisma.syncSettings.findUnique({
          where: { userId: context.user.id },
          select: { staleMeasurementDays: true },
        });
        const staleMeasurementDays = syncSettings?.staleMeasurementDays || 10;
        const staleDate = new Date();
        staleDate.setDate(staleDate.getDate() - staleMeasurementDays);
        whereClause.docketwiseUpdatedAt = { lte: staleDate };
      } else {
        // Fetch status group mappings
        const statusGroup = await prisma.statusGroups.findFirst({
          where: {
            id: input.statusGroupId,
            userId: context.user.id,
          },
          include: {
            statusGroupMappings: {
              select: {
                matterStatus: {
                  select: { docketwiseId: true },
                },
              },
            },
          },
        });

        if (statusGroup) {
          const docketwiseStatusIds = statusGroup.statusGroupMappings.map(
            (mapping) => mapping.matterStatus.docketwiseId
          );
          
          // Match on statusId OR statusForFilingId
          if (docketwiseStatusIds.length > 0) {
            whereClause.OR = whereClause.OR || [];
            whereClause.OR.push(
              { statusId: { in: docketwiseStatusIds } },
              { statusForFilingId: { in: docketwiseStatusIds } }
            );
          }
        }
      }
    }

    // Has deadline filter
    if (input.hasDeadline !== undefined) {
      whereClause.deadline = input.hasDeadline ? { not: null } : null;
    }

    // Date range filter
    if (input.dateFrom || input.dateTo) {
      whereClause.docketwiseCreatedAt = {};
      if (input.dateFrom) {
        whereClause.docketwiseCreatedAt.gte = new Date(input.dateFrom);
      }
      if (input.dateTo) {
        const toDate = new Date(input.dateTo);
        toDate.setHours(23, 59, 59, 999);
        whereClause.docketwiseCreatedAt.lte = toDate;
      }
    }

    // Get sync settings for stale measurement
    const syncSettings = await prisma.syncSettings.findUnique({
      where: { userId: context.user.id },
      select: { staleMeasurementDays: true },
    });
    const staleMeasurementDays = syncSettings?.staleMeasurementDays || 10;

    // Fetch from database with filters
    const [totalCount, dbMatters] = await Promise.all([
      prisma.matters.count({ where: whereClause }),
      prisma.matters.findMany({
        where: whereClause,
        orderBy: { docketwiseCreatedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

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

    // Post-process filters that need complex logic (assignees, activity status)
    // Most filters are already handled by database query
    const filteredMatters = dbMatters.filter((matter) => {
      // Assignee filter - needs to check assignees field
      if (input.assignees) {
        const assigneesLower = input.assignees.toLowerCase();
        const matchLegacyAssignees = matter.assignees?.toLowerCase().includes(assigneesLower);
        if (!matchLegacyAssignees) return false;
      }

      // Activity status filter (active/stale/archived)
      if (input.activityStatus) {
        const activityStatus = getMatterActivityStatus(
          {
            archived: matter.archived,
            closedAt: matter.closedAt,
            status: matter.status,
            docketwiseUpdatedAt: matter.docketwiseUpdatedAt,
            updatedAt: matter.updatedAt,
          },
          staleMeasurementDays
        );
        
        if (activityStatus !== input.activityStatus) return false;
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
          totalHoursElapsed = Math.round(diffMs / (1000 * 60 * 60));
        }
      }

      // Apply epoch date filtering (dates <= 1970 are treated as null)
      const deadline = matter.deadline && new Date(matter.deadline).getFullYear() > 1970
        ? matter.deadline
        : null;

      return {
        id: matter.id,
        docketwiseId: matter.docketwiseId,
        title: matter.title,
        description: matter.description,
        clientName: matter.clientName,
        clientId: matter.clientId,
        matterType: matter.matterType,
        matterTypeId: matter.matterTypeId,
        status: matter.status,
        statusId: matter.statusId,
        statusForFiling: matter.statusForFiling,
        statusForFilingId: matter.statusForFilingId,
        teamId: matter.teamId,
        docketwiseCreatedAt: matter.docketwiseCreatedAt,
        docketwiseUpdatedAt: matter.docketwiseUpdatedAt,
        assignee: null, // No relation - assignees stored as string
        assignees: matter.assignees,
        docketwiseUserIds: matter.docketwiseUserIds,
        openedAt: matter.openedAt,
        closedAt: matter.closedAt,
        assignedDate: matter.assignedDate,
        deadline,
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
        editedByUser: null, // No relation in database
        userId: matter.userId,
        createdAt: matter.createdAt,
        updatedAt: matter.updatedAt,
        calculatedDeadline,
        isPastEstimatedDeadline,
        totalHoursElapsed,
      };
    });

    // Database pagination is already applied
    const totalPages = Math.ceil(totalCount / perPage);
    
    return {
      data: mattersWithDeadlines,
      pagination: {
        total: totalCount,
        page,
        perPage,
        totalPages,
      },
    };
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
    // BUT only if user didn't explicitly provide an assignedDate
    const hasAssignee = updateData.assignees || updateData.teamId;
    if (hasAssignee && !existingMatter.assignedDate && updateData.assignedDate === undefined) {
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
      // Deadline changes
      deadline: updatedMatter.deadline,
      oldDeadline: existingMatter.deadline,
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
      deadline: z.coerce.date().optional(),
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
        deadline: input.deadline,
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
    if (input.deadline) {
      checkMatterChangesAndNotify({
        matterId: matter.id,
        matterTitle: matter.title,
        clientName: matter.clientName,
        matterType: matter.matterType,
        deadline: matter.deadline,
        oldDeadline: null,
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
