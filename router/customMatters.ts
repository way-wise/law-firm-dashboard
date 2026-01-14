import { authorized } from "@/lib/orpc";
import prisma, { Prisma } from "@/lib/prisma";
import {
  matterFilterSchema,
  matterSchema,
  paginatedMattersSchema,
  updateCustomMatterFieldsSchema,
} from "@/schema/customMatterSchema";
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

    const matter = await prisma.matters.findUnique({
      where: { id, userId: context.user.id },
    });

    if (!matter) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }

    const updatedMatter = await prisma.matters.update({
      where: { id },
      data: {
        ...updateData,
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

    return updatedMatter;
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
