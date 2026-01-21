import { authorized } from "@/lib/orpc";
import prisma, { Prisma } from "@/lib/prisma";
import {
  matterFilterSchema,
  matterSchema,
  paginatedMattersSchema,
  updateCustomMatterFieldsSchema,
} from "@/schema/customMatterSchema";
import { checkMatterChangesAndNotify } from "@/lib/notifications/notification-service";
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
    const skip = (page - 1) * perPage;

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
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
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

    return { success: true };
  });
