import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import {
  createStatusGroupSchema,
  updateStatusGroupSchema,
  statusGroupWithCountSchema,
  paginatedStatusGroupsSchema,
} from "@/schema/statusGroupSchema";
import * as z from "zod";

// Get all status groups with matter counts
export const getStatusGroups = authorized
  .route({
    method: "GET",
    path: "/status-groups",
    summary: "Get all status groups with matter counts",
    tags: ["Status Groups"],
  })
  .input(
    z.object({
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(50),
      includeInactive: z.boolean().optional().default(false),
    })
  )
  .output(paginatedStatusGroupsSchema)
  .handler(async ({ input, context }) => {
    const { page, perPage, includeInactive } = input;
    
    const where = {
      userId: context.user.id,
      ...(includeInactive ? {} : { isActive: true }),
    };

    const [statusGroups, total] = await Promise.all([
      prisma.statusGroups.findMany({
        where,
        include: {
          statusGroupMappings: {
            include: {
              matterStatus: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.statusGroups.count({ where }),
    ]);

    // Get matter counts for each status group
    const statusGroupsWithCounts = await Promise.all(
      statusGroups.map(async (group) => {
        // Get all Docketwise status IDs in this group
        const docketwiseStatusIds = group.statusGroupMappings.map(
          (mapping) => mapping.matterStatus.docketwiseId
        );

        // Count matters that have these statuses
        const matterCount = await prisma.matters.count({
          where: {
            userId: context.user.id,
            archived: false,
            discardedAt: null,
            OR: [
              { statusId: { in: docketwiseStatusIds } },
              { statusForFilingId: { in: docketwiseStatusIds } },
            ],
          },
        });

        return {
          id: group.id,
          userId: group.userId,
          name: group.name,
          description: group.description,
          color: group.color,
          icon: group.icon,
          displayOrder: group.displayOrder,
          isActive: group.isActive,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          matterCount,
          matterStatusIds: group.statusGroupMappings.map((m) => m.matterStatusId),
        };
      })
    );

    return {
      statusGroups: statusGroupsWithCounts,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    };
  });

// Get single status group by ID
export const getStatusGroupById = authorized
  .route({
    method: "GET",
    path: "/status-groups/:id",
    summary: "Get status group by ID",
    tags: ["Status Groups"],
  })
  .input(z.object({ id: z.string() }))
  .output(statusGroupWithCountSchema)
  .handler(async ({ input, context }) => {
    const group = await prisma.statusGroups.findFirst({
      where: {
        id: input.id,
        userId: context.user.id,
      },
      include: {
        statusGroupMappings: {
          include: {
            matterStatus: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error("Status group not found");
    }

    // Get matter count
    const docketwiseStatusIds = group.statusGroupMappings.map(
      (mapping) => mapping.matterStatus.docketwiseId
    );

    const matterCount = await prisma.matters.count({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        OR: [
          { statusId: { in: docketwiseStatusIds } },
          { statusForFilingId: { in: docketwiseStatusIds } },
        ],
      },
    });

    return {
      id: group.id,
      userId: group.userId,
      name: group.name,
      description: group.description,
      color: group.color,
      icon: group.icon,
      displayOrder: group.displayOrder,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      matterCount,
      matterStatusIds: group.statusGroupMappings.map((m) => m.matterStatusId),
    };
  });

// Create status group
export const createStatusGroup = authorized
  .route({
    method: "POST",
    path: "/status-groups",
    summary: "Create a new status group",
    tags: ["Status Groups"],
  })
  .input(createStatusGroupSchema)
  .output(statusGroupWithCountSchema)
  .handler(async ({ input, context }) => {
    const { matterStatusIds, ...groupData } = input;

    // Check if name already exists for this user
    const existing = await prisma.statusGroups.findUnique({
      where: {
        userId_name: {
          userId: context.user.id,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new Error("A status group with this name already exists");
    }

    // Create group with mappings in transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.statusGroups.create({
        data: {
          userId: context.user.id,
          name: groupData.name,
          description: groupData.description,
          color: groupData.color,
          icon: groupData.icon,
          displayOrder: groupData.displayOrder,
        },
      });

      // Create mappings
      await tx.statusGroupMappings.createMany({
        data: matterStatusIds.map((statusId) => ({
          statusGroupId: newGroup.id,
          matterStatusId: statusId,
        })),
      });

      return newGroup;
    });

    // Fetch complete group data
    const completeGroup = await prisma.statusGroups.findUnique({
      where: { id: group.id },
      include: {
        statusGroupMappings: {
          include: {
            matterStatus: true,
          },
        },
      },
    });

    if (!completeGroup) {
      throw new Error("Failed to create status group");
    }

    // Get matter count
    const docketwiseStatusIds = completeGroup.statusGroupMappings.map(
      (mapping) => mapping.matterStatus.docketwiseId
    );

    const matterCount = await prisma.matters.count({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        OR: [
          { statusId: { in: docketwiseStatusIds } },
          { statusForFilingId: { in: docketwiseStatusIds } },
        ],
      },
    });

    return {
      id: completeGroup.id,
      userId: completeGroup.userId,
      name: completeGroup.name,
      description: completeGroup.description,
      color: completeGroup.color,
      icon: completeGroup.icon,
      displayOrder: completeGroup.displayOrder,
      isActive: completeGroup.isActive,
      createdAt: completeGroup.createdAt,
      updatedAt: completeGroup.updatedAt,
      matterCount,
      matterStatusIds: completeGroup.statusGroupMappings.map((m) => m.matterStatusId),
    };
  });

// Update status group
export const updateStatusGroup = authorized
  .route({
    method: "PUT",
    path: "/status-groups/:id",
    summary: "Update a status group",
    tags: ["Status Groups"],
  })
  .input(z.object({ id: z.string() }).merge(updateStatusGroupSchema))
  .output(statusGroupWithCountSchema)
  .handler(async ({ input, context }) => {
    const { id, matterStatusIds, ...updateData } = input;

    // Check ownership
    const existing = await prisma.statusGroups.findFirst({
      where: { id, userId: context.user.id },
    });

    if (!existing) {
      throw new Error("Status group not found");
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update group data
      if (Object.keys(updateData).length > 0) {
        await tx.statusGroups.update({
          where: { id },
          data: updateData,
        });
      }

      // Update mappings if provided
      if (matterStatusIds) {
        // Delete old mappings
        await tx.statusGroupMappings.deleteMany({
          where: { statusGroupId: id },
        });

        // Create new mappings
        await tx.statusGroupMappings.createMany({
          data: matterStatusIds.map((statusId) => ({
            statusGroupId: id,
            matterStatusId: statusId,
          })),
        });
      }
    });

    // Fetch updated group
    const updatedGroup = await prisma.statusGroups.findUnique({
      where: { id },
      include: {
        statusGroupMappings: {
          include: {
            matterStatus: true,
          },
        },
      },
    });

    if (!updatedGroup) {
      throw new Error("Failed to update status group");
    }

    // Get matter count
    const docketwiseStatusIds = updatedGroup.statusGroupMappings.map(
      (mapping) => mapping.matterStatus.docketwiseId
    );

    const matterCount = await prisma.matters.count({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        OR: [
          { statusId: { in: docketwiseStatusIds } },
          { statusForFilingId: { in: docketwiseStatusIds } },
        ],
      },
    });

    return {
      id: updatedGroup.id,
      userId: updatedGroup.userId,
      name: updatedGroup.name,
      description: updatedGroup.description,
      color: updatedGroup.color,
      icon: updatedGroup.icon,
      displayOrder: updatedGroup.displayOrder,
      isActive: updatedGroup.isActive,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
      matterCount,
      matterStatusIds: updatedGroup.statusGroupMappings.map((m) => m.matterStatusId),
    };
  });

// Delete status group
export const deleteStatusGroup = authorized
  .route({
    method: "DELETE",
    path: "/status-groups/:id",
    summary: "Delete a status group",
    tags: ["Status Groups"],
  })
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.boolean(), message: z.string() }))
  .handler(async ({ input, context }) => {
    // Check ownership
    const existing = await prisma.statusGroups.findFirst({
      where: { id: input.id, userId: context.user.id },
    });

    if (!existing) {
      throw new Error("Status group not found");
    }

    // Delete (mappings will cascade)
    await prisma.statusGroups.delete({
      where: { id: input.id },
    });

    return {
      success: true,
      message: "Status group deleted successfully",
    };
  });
