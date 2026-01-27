import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncMatters } from "@/lib/sync/docketwise-sync";

// This endpoint handles auto-syncing based on user configurations
// It should be called periodically (e.g., every 15-30 minutes) by an external cron service
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[CRON] Starting auto-sync check...");

    // Find all users with sync enabled
    const settings = await prisma.syncSettings.findMany({
      where: {
        isEnabled: true,
      },
    });

    const results = [];
    const now = new Date();

    for (const setting of settings) {
      // Default to 30 minutes if not set (though schema default is 30)
      const intervalMinutes = setting.pollingInterval || 30;
      const lastSync = setting.lastSyncAt;

      // Check if sync is due
      let shouldSync = false;
      if (!lastSync) {
        shouldSync = true; // Never synced
      } else {
        const diffMs = now.getTime() - lastSync.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        shouldSync = diffMinutes >= intervalMinutes;
      }

      if (shouldSync) {
        console.log(`[CRON] Syncing for user ${setting.userId} (Interval: ${intervalMinutes}m)...`);
        try {
          // Perform the sync
          const result = await syncMatters(setting.userId);

          // Update lastSyncAt
          await prisma.syncSettings.update({
            where: { id: setting.id },
            data: { lastSyncAt: now },
          });

          results.push({
            userId: setting.userId,
            status: "success",
            recordsProcessed: result.recordsProcessed,
          });
        } catch (error) {
          console.error(`[CRON] Sync failed for user ${setting.userId}:`, error);
          results.push({
            userId: setting.userId,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        // results.push({ userId: setting.userId, status: "skipped", reason: "not_due" });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error in auto-sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Support POST as well
export const POST = GET;
