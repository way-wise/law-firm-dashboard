import { NextRequest, NextResponse } from "next/server";
import { checkAndSendDeadlineNotifications } from "@/lib/notifications/scheduler";

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
// Recommended: Run daily at 9 AM
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

    console.log("[CRON] Starting deadline notification check...");
    const result = await checkAndSendDeadlineNotifications();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error in deadline check:", error);
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

// Also support POST for manual triggers
export const POST = GET;
