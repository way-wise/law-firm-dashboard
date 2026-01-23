import * as z from "zod";

export const syncSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pollingInterval: z.number().int().min(5).max(1440), // 5 min to 24 hours
  lastSyncAt: z.date().nullable(),
  isEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const updateSyncSettingsSchema = z.object({
  pollingInterval: z.number().int().min(5).max(1440), // 5 min to 24 hours
});

export const syncResultSchema = z.object({
  success: z.boolean(),
  recordsProcessed: z.number(),
  recordsCreated: z.number(),
  recordsUpdated: z.number(),
});

export type SyncSettingsSchemaType = z.infer<typeof syncSettingsSchema>;
export type UpdateSyncSettingsSchemaType = z.infer<typeof updateSyncSettingsSchema>;
export type SyncResultSchemaType = z.infer<typeof syncResultSchema>;
