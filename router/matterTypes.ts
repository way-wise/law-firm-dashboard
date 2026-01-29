import { getDocketwiseToken } from "@/lib/docketwise";
import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Schema for matter type with custom fields
const matterTypeSchema = z.object({
  id: z.string(),
  docketwiseId: z.number(),
  name: z.string(),
  estimatedDays: z.number().nullable(),
  categoryId: z.string().nullable(),
  category: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
  }).nullable(),
  isEdited: z.boolean(),
  editedAt: z.date().nullable(),
  lastSyncedAt: z.date(),
  matterStatuses: z.array(z.object({
    id: z.string(),
    docketwiseId: z.number(),
    name: z.string(),
    duration: z.number().nullable(),
    sort: z.number().nullable(),
  })),
});

// Get all matter types (from local DB, synced from Docketwise)
export const getMatterTypes = authorized
  .route({
    method: "GET",
    path: "/matter-types",
    summary: "Get all matter types with custom fields",
    tags: ["Matter Types"],
  })
  .output(z.array(matterTypeSchema))
  .handler(async () => {
    const matterTypes = await prisma.matterTypes.findMany({
      include: {
        category: true,
        matterStatuses: true,
      },
      orderBy: { name: "asc" },
    });

    return matterTypes;
  });

// Sync matter types from Docketwise
export const syncMatterTypes = authorized
  .route({
    method: "POST",
    path: "/matter-types/sync",
    summary: "Sync matter types from Docketwise",
    tags: ["Matter Types"],
  })
  .output(z.object({ synced: z.number(), message: z.string() }))
  .handler(async () => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      // Fetch matter types from Docketwise
      const response = await fetch(`${DOCKETWISE_API_URL}/matter_types`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Docketwise API error: ${response.status}`,
        });
      }

      const docketwiseTypes = await response.json();
      let syncedCount = 0;

      for (const dwType of docketwiseTypes) {
        // Check if already exists
        const existing = await prisma.matterTypes.findUnique({
          where: { docketwiseId: dwType.id },
        });

        if (existing) {
          // Only update if not edited
          if (!existing.isEdited) {
            await prisma.matterTypes.update({
              where: { docketwiseId: dwType.id },
              data: {
                name: dwType.name,
                lastSyncedAt: new Date(),
              },
            });
          }
        } else {
          // Create new
          await prisma.matterTypes.create({
            data: {
              docketwiseId: dwType.id,
              name: dwType.name,
              flatFee: null, // Default to null, will be updated manually
              lastSyncedAt: new Date(),
            },
          });
        }

        // Sync matter statuses for this type
        if (dwType.matter_statuses && Array.isArray(dwType.matter_statuses)) {
          const matterType = await prisma.matterTypes.findUnique({
            where: { docketwiseId: dwType.id },
          });

          if (matterType) {
            for (const status of dwType.matter_statuses) {
              await prisma.matterStatuses.upsert({
                where: { docketwiseId: status.id },
                update: {
                  name: status.name,
                  duration: status.duration,
                  sort: status.sort,
                  matterTypeId: matterType.id,
                  lastSyncedAt: new Date(),
                },
                create: {
                  docketwiseId: status.id,
                  name: status.name,
                  duration: status.duration,
                  sort: status.sort,
                  matterTypeId: matterType.id,
                  lastSyncedAt: new Date(),
                },
              });
            }
          }
        }

        syncedCount++;
      }

      return {
        synced: syncedCount,
        message: `Successfully synced ${syncedCount} matter types from Docketwise`,
      };
    } catch (error) {
      console.error("Sync error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: error instanceof Error ? error.message : "Failed to sync matter types",
      });
    }
  });

// Update matter type custom fields
export const updateMatterType = authorized
  .route({
    method: "PATCH",
    path: "/matter-types/{id}",
    summary: "Update matter type custom fields",
    tags: ["Matter Types"],
  })
  .input(z.object({
    id: z.string(),
    estimatedDays: z.number().nullable().optional(),
    categoryId: z.string().nullable().optional(),
  }))
  .output(matterTypeSchema)
  .handler(async ({ input, context }) => {
    const { id, ...updateData } = input;

    const matterType = await prisma.matterTypes.findUnique({
      where: { id },
    });

    if (!matterType) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter type not found",
      });
    }

    const updated = await prisma.matterTypes.update({
      where: { id },
      data: {
        ...updateData,
        isEdited: true,
        editedBy: context.user.id,
        editedAt: new Date(),
      },
      include: {
        category: true,
        matterStatuses: true,
      },
    });

    return updated;
  });

// Get all categories for dropdown
export const getCategories = authorized
  .route({
    method: "GET",
    path: "/categories",
    summary: "Get all immigration categories",
    tags: ["Categories"],
  })
  .output(z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    sortOrder: z.number(),
    isActive: z.boolean(),
  })))
  .handler(async () => {
    const categories = await prisma.categories.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return categories;
  });

// Create category
export const createCategory = authorized
  .route({
    method: "POST",
    path: "/categories",
    summary: "Create a new category",
    tags: ["Categories"],
  })
  .input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    color: z.string().optional(),
    sortOrder: z.number().optional(),
  }))
  .output(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    sortOrder: z.number(),
    isActive: z.boolean(),
  }))
  .handler(async ({ input }) => {
    const category = await prisma.categories.create({
      data: {
        name: input.name,
        description: input.description,
        color: input.color,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return category;
  });

// Update category
export const updateCategory = authorized
  .route({
    method: "PATCH",
    path: "/categories/{id}",
    summary: "Update a category",
    tags: ["Categories"],
  })
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional(),
  }))
  .output(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    sortOrder: z.number(),
    isActive: z.boolean(),
  }))
  .handler(async ({ input }) => {
    const { id, ...updateData } = input;

    const category = await prisma.categories.update({
      where: { id },
      data: updateData,
    });

    return category;
  });

// Delete category
export const deleteCategory = authorized
  .route({
    method: "DELETE",
    path: "/categories/{id}",
    summary: "Delete a category",
    tags: ["Categories"],
  })
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input }) => {
    await prisma.categories.delete({
      where: { id: input.id },
    });

    return { success: true };
  });
