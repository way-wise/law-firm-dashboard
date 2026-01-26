import { authorized } from "@/lib/orpc";
import prisma, { Prisma } from "@/lib/prisma";
import { getOrSetCache, invalidateCache, CACHE_KEYS } from "@/lib/redis";
import {
  matterFilterSchema,
  matterSchema,
  paginatedMattersSchema,
  updateCustomMatterFieldsSchema,
} from "@/schema/customMatterSchema";
import { checkMatterChangesAndNotify } from "@/lib/notifications/notification-service";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

// Shorter cache TTL for matters list (5 minutes) since data changes more frequently
const MATTERS_CACHE_TTL = 5 * 60;

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
    const skip = (page - 1) * perPage;
    
    // Build cache key from all filter parameters
    const filterKey = JSON.stringify({
      page,
      search: input.search || '',
      billingStatus: input.billingStatus || '',
      assignees: input.assignees || '',
      isStale: input.isStale,
      hasDeadline: input.hasDeadline,
    });
    const cacheKey = `${CACHE_KEYS.MATTERS_LIST}:${context.user.id}:${filterKey}`;

    return getOrSetCache(cacheKey, async () => {
      const where: Prisma.mattersWhereInput = {
        userId: context.user.id,
      };

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { clientName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.billingStatus) {
        where.billingStatus = input.billingStatus;
      }

      if (input.assignees) {
        where.assignees = { contains: input.assignees, mode: "insensitive" };
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

      // Fetch matters, docketwiseUsers, and matterTypes in parallel
      const [matters, total, docketwiseUsers, matterTypes] = await Promise.all([
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
        prisma.docketwiseUsers.findMany({
          select: {
            docketwiseId: true,
            fullName: true,
            email: true,
          },
        }),
        prisma.matterTypes.findMany({
          select: {
            docketwiseId: true,
            estimatedDays: true,
          },
        }),
      ]);

      // Build a map of docketwiseId -> fullName for quick lookup
      const userMap = new Map<number, string>();
      for (const user of docketwiseUsers) {
        userMap.set(user.docketwiseId, user.fullName || user.email);
      }

      // Build a map of matterTypeId -> estimatedDays for deadline calculation
      const matterTypeEstDaysMap = new Map<number, number>();
      for (const mt of matterTypes) {
        if (mt.estimatedDays) {
          matterTypeEstDaysMap.set(mt.docketwiseId, mt.estimatedDays);
        }
      }

      // Resolve assignees and calculate dynamic deadline for each matter
      const mattersWithAssignees = matters.map((matter) => {
        let resolvedAssignees: string | null = matter.assignees;
        
        // Always try to resolve from docketwiseUserIds if assignees is empty
        if (!resolvedAssignees && matter.docketwiseUserIds) {
          try {
            const rawIds = JSON.parse(matter.docketwiseUserIds);
            const userIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
              .map((id: unknown) => Number(id))
              .filter((id: number) => !isNaN(id));
            const names = userIds
              .map((id: number) => userMap.get(id))
              .filter((name): name is string => !!name);
            resolvedAssignees = names.length > 0 ? names.join(", ") : null;
          } catch {
            // If parsing fails, leave as null
          }
        }

        // Calculate dynamic estimated deadline based on matterType's estimatedDays
        let calculatedDeadline: Date | null = null;
        let isPastEstimatedDeadline = false;
        
        if (matter.docketwiseCreatedAt && matter.matterTypeId) {
          const createdAt = new Date(matter.docketwiseCreatedAt);
          // Validate the date is valid and not epoch (1970)
          if (!isNaN(createdAt.getTime()) && createdAt.getFullYear() > 1970) {
            const estDays = matterTypeEstDaysMap.get(matter.matterTypeId);
            if (estDays && estDays > 0) {
              calculatedDeadline = new Date(createdAt);
              calculatedDeadline.setDate(calculatedDeadline.getDate() + estDays);
              isPastEstimatedDeadline = new Date() > calculatedDeadline;
            }
          }
        }
        
        return {
          ...matter,
          assignees: resolvedAssignees,
          calculatedDeadline,
          isPastEstimatedDeadline,
        };
      });

      return {
        data: mattersWithAssignees,
        pagination: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
        },
      };
    }, MATTERS_CACHE_TTL);
  });

// Get Custom Matter by ID
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
      },
    });

    if (!matter || matter.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }

    return matter;
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
      },
    });

    // Invalidate matters cache for this user
    await invalidateCache(`${CACHE_KEYS.MATTERS_LIST}:${context.user.id}:*`);

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

    return updatedMatter;
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
      },
    });

    // Invalidate matters cache for this user
    await invalidateCache(`${CACHE_KEYS.MATTERS_LIST}:${context.user.id}:*`);

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

    return matter;
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

    // Invalidate matters cache for this user
    await invalidateCache(`${CACHE_KEYS.MATTERS_LIST}:${context.user.id}:*`);

    return { success: true };
  });
