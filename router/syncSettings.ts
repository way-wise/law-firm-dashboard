import { syncReferenceData } from "@/lib/sync/reference-data-sync";
import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import {
  syncResultSchema,
  syncSettingsSchema,
  updateSyncSettingsSchema,
} from "@/schema/syncSettingsSchema";
import { ORPCError } from "@orpc/server";

// Get Sync Settings
export const getSyncSettings = authorized
  .route({
    method: "GET",
    path: "/sync/settings",
    summary: "Get user's sync configuration",
    tags: ["Sync"],
  })
  .output(syncSettingsSchema)
  .handler(async ({ context }) => {
    let settings = await prisma.syncSettings.findUnique({
      where: { userId: context.user.id },
    });

    if (!settings) {
      settings = await prisma.syncSettings.create({
        data: {
          userId: context.user.id,
          pollingInterval: 720, // Default to 12 hours
          isEnabled: true,
        },
      });
    }

    return settings;
  });

// Update Sync Settings
export const updateSyncSettings = authorized
  .route({
    method: "PATCH",
    path: "/sync/settings",
    summary: "Update polling interval",
    tags: ["Sync"],
  })
  .input(updateSyncSettingsSchema)
  .output(syncSettingsSchema)
  .handler(async ({ input, context }) => {
    const settings = await prisma.syncSettings.upsert({
      where: { userId: context.user.id },
      update: {
        pollingInterval: input.pollingInterval,
      },
      create: {
        userId: context.user.id,
        pollingInterval: input.pollingInterval,
        isEnabled: true,
      },
    });

    return settings;
  });

// Trigger Manual Sync
export const triggerManualSync = authorized
  .route({
    method: "POST",
    path: "/sync/trigger",
    summary: "Trigger immediate sync",
    tags: ["Sync"],
  })
  .output(syncResultSchema)
  .handler(async ({ context }) => {
    try {
      const result = await syncReferenceData(context.user.id);

      await prisma.syncSettings.update({
        where: { userId: context.user.id },
        data: { lastSyncAt: new Date() },
      });

      return result;
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: error instanceof Error ? error.message : "Sync failed",
      });
    }
  });
