import * as z from "zod";

export const statusGroupSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  displayOrder: z.number(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  matterStatusIds: z.array(z.string()).optional(), // For UI display
  matterCount: z.number().optional(), // Count of matters in this group
});

export const createStatusGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be valid hex color").optional(),
  icon: z.string().max(50).optional(),
  displayOrder: z.number().int().min(0).default(0),
  matterStatusIds: z.array(z.string()).min(1, "Must select at least one status"),
});

export const updateStatusGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  matterStatusIds: z.array(z.string()).optional(),
});

export const statusGroupWithCountSchema = statusGroupSchema.extend({
  matterCount: z.number(),
  matterStatusIds: z.array(z.string()),
});

export const paginatedStatusGroupsSchema = z.object({
  statusGroups: z.array(statusGroupWithCountSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export type StatusGroup = z.infer<typeof statusGroupSchema>;
export type CreateStatusGroup = z.infer<typeof createStatusGroupSchema>;
export type UpdateStatusGroup = z.infer<typeof updateStatusGroupSchema>;
export type StatusGroupWithCount = z.infer<typeof statusGroupWithCountSchema>;
