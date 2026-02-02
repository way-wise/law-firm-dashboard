import { authorized } from "@/lib/orpc";
import { syncReferenceData } from "@/lib/sync/reference-data-sync";
import { syncMatters } from "@/lib/sync/matters-sync";
import { syncMatterDetails } from "@/lib/sync/matter-details-sync";
import prisma from "@/lib/prisma";
import * as z from "zod";

const syncPhaseResultSchema = z.object({
  phase: z.string(),
  success: z.boolean(),
  total: z.number().optional(),
  created: z.number().optional(),
  updated: z.number().optional(),
  processed: z.number().optional(),
  failed: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

const unifiedSyncResultSchema = z.object({
  success: z.boolean(),
  phases: z.array(syncPhaseResultSchema),
  totalDuration: z.number(),
  message: z.string(),
});

/**
 * Background sync executor - runs without blocking the HTTP response
 */
async function runSyncInBackground(userId: string) {
  const startTime = Date.now();
  const phases: z.infer<typeof syncPhaseResultSchema>[] = [];

  try {
    console.log("[UNIFIED-SYNC] Starting complete synchronization in background...");

    // Mark sync as running from the start
    await prisma.syncProgress.upsert({
      where: {
        userId_syncType: {
          userId: userId,
          syncType: "unified_sync",
        },
      },
      update: {
        status: "syncing",
        updatedAt: new Date(),
      },
      create: {
        userId: userId,
        syncType: "unified_sync",
        status: "syncing",
        totalProcessed: 0,
        totalFailed: 0,
      },
    });

    // Phase 1: Reference Data (Teams, Contacts, Matter Types, Statuses)
    console.log("[UNIFIED-SYNC] Phase 1: Syncing reference data...");
    try {
      const refResult = await syncReferenceData(userId);
      phases.push({
        phase: "reference_data",
        success: refResult.success,
        total: refResult.recordsProcessed,
        message: `Synced ${refResult.recordsProcessed} reference data records (teams, contacts, matter types, statuses)`,
      });

      // Update sync settings
      await prisma.syncSettings.update({
        where: { userId: userId },
        data: { lastSyncAt: new Date() },
      });
    } catch (error) {
      console.error("[UNIFIED-SYNC] Phase 1 failed:", error);
      phases.push({
        phase: "reference_data",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error; // Stop if reference data fails
    }

    // Phase 2: Matters (List - basic info)
    console.log("[UNIFIED-SYNC] Phase 2: Syncing matters list...");
    try {
      const mattersResult = await syncMatters(userId);
      phases.push({
        phase: "matters",
        success: mattersResult.success,
        total: mattersResult.total,
        created: mattersResult.created,
        updated: mattersResult.updated,
        message: `Synced ${mattersResult.total} matters (${mattersResult.created} new, ${mattersResult.updated} updated)`,
      });
    } catch (error) {
      console.error("[UNIFIED-SYNC] Phase 2 failed:", error);
      phases.push({
        phase: "matters",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Continue even if matters list fails - we'll try details anyway
    }

    // Phase 3: Matter Details (Individual - full info with assignees)
    console.log("[UNIFIED-SYNC] Phase 3: Syncing matter details...");
    try {
      const detailsResult = await syncMatterDetails(userId);
      phases.push({
        phase: "matter_details",
        success: detailsResult.success,
        processed: detailsResult.totalProcessed,
        failed: detailsResult.totalFailed,
        message: detailsResult.message,
      });
    } catch (error) {
      console.error("[UNIFIED-SYNC] Phase 3 failed:", error);
      phases.push({
        phase: "matter_details",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const duration = Date.now() - startTime;
    const allSucceeded = phases.every((p) => p.success);

    console.log(
      `[UNIFIED-SYNC] Complete! Duration: ${(duration / 1000).toFixed(1)}s, Success: ${allSucceeded}`,
    );

    // Mark unified sync as completed
    await prisma.syncProgress.updateMany({
      where: {
        userId: userId,
        syncType: "unified_sync",
      },
      data: {
        status: "completed",
        updatedAt: new Date(),
      },
    });

    console.log("[UNIFIED-SYNC] Background sync completed successfully");
  } catch (error) {
    console.error("[UNIFIED-SYNC] Fatal error:", error);

    // Mark unified sync as failed
    await prisma.syncProgress.updateMany({
      where: {
        userId: userId,
        syncType: "unified_sync",
      },
      data: {
        status: "failed",
        updatedAt: new Date(),
      },
    }).catch(() => {
      // Ignore error if update fails
    });
  }
}

/**
 * Unified sync coordinator - starts sync in background and returns immediately
 */
export const unifiedSync = authorized
  .route({
    method: "POST",
    path: "/sync/unified",
    summary: "Start complete data synchronization in background",
    tags: ["Sync"],
  })
  .output(
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  )
  .handler(async ({ context }) => {
    console.log("[UNIFIED-SYNC] Starting sync in background for user:", context.user.id);

    // Fire and forget - don't await
    runSyncInBackground(context.user.id).catch((error) => {
      console.error("[UNIFIED-SYNC] Background sync failed:", error);
    });

    // Return immediately
    return {
      success: true,
      message: "Synchronization started in background. Check status for progress.",
    };
  });

/**
 * Get current sync status
 */
export const getSyncStatus = authorized
  .route({
    method: "GET",
    path: "/sync/status",
    summary: "Get current synchronization status",
    tags: ["Sync"],
  })
  .output(
    z.object({
      isRunning: z.boolean(),
      isFailed: z.boolean(),
      failureReason: z.string().nullable(),
      currentPhase: z.string().nullable(),
      phaseName: z.string().nullable(),
      progress: z
        .object({
          processed: z.number(),
          total: z.number(),
          percentage: z.number(),
        })
        .nullable(),
      lastSync: z.date().nullable(),
    }),
  )
  .handler(async ({ context }) => {
    // Check if any sync is running (unified or matter details)
    const [unifiedSync, matterDetailsSync] = await Promise.all([
      prisma.syncProgress.findUnique({
        where: {
          userId_syncType: {
            userId: context.user.id,
            syncType: "unified_sync",
          },
        },
      }),
      prisma.syncProgress.findUnique({
        where: {
          userId_syncType: {
            userId: context.user.id,
            syncType: "matter_details",
          },
        },
      }),
    ]);

    const syncSettings = await prisma.syncSettings.findUnique({
      where: { userId: context.user.id },
    });

    const isUnifiedRunning = unifiedSync?.status === "syncing";
    const isMatterDetailsRunning = matterDetailsSync?.status === "syncing";
    const isUnifiedFailed = unifiedSync?.status === "failed";
    const isMatterDetailsFailed = matterDetailsSync?.status === "failed";
    const isRunning = isUnifiedRunning || isMatterDetailsRunning;
    const isFailed = isUnifiedFailed || isMatterDetailsFailed;
    
    let progress = null;
    let currentPhase = null;
    let phaseName = null;
    let failureReason = null;

    // Check for failure reason
    if (isMatterDetailsFailed && matterDetailsSync?.failureReason) {
      failureReason = matterDetailsSync.failureReason;
      currentPhase = "matter_details";
      phaseName = "Matter Details";
    } else if (isUnifiedFailed && unifiedSync?.failureReason) {
      failureReason = unifiedSync.failureReason;
    }

    if (isMatterDetailsRunning && matterDetailsSync) {
      // Matter details phase is running
      const totalMatters = await prisma.matters.count({
        where: {
          userId: context.user.id,
          discardedAt: null,
        },
      });

      const processed = matterDetailsSync.totalProcessed || 0;
      const percentage = totalMatters > 0 ? Math.min((processed / totalMatters) * 100, 100) : 0;

      progress = {
        processed,
        total: totalMatters,
        percentage: Math.round(percentage),
      };
      currentPhase = "matter_details";
      phaseName = "Matter Details";
    } else if (isUnifiedRunning) {
      // Check which phase we're in based on database records
      const [mattersCount, typesCount] = await Promise.all([
        prisma.matters.count({
          where: { userId: context.user.id, discardedAt: null },
        }),
        prisma.matterTypes.count(),
      ]);

      if (mattersCount > 0) {
        // We have matters, probably in matters list phase or between phases
        currentPhase = "matters_list";
        phaseName = "Matters List";
      } else if (typesCount > 0) {
        // We have types but no matters yet, in reference data phase
        currentPhase = "reference_data";
        phaseName = "Reference Data";
      } else {
        // Just started
        currentPhase = "starting";
        phaseName = "Starting";
      }

      progress = {
        processed: 0,
        total: 0,
        percentage: 0,
      };
    }

    return {
      isRunning,
      isFailed,
      failureReason,
      currentPhase,
      phaseName,
      progress,
      lastSync: syncSettings?.lastSyncAt || null,
    };
  });
