import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendNotification, type NotificationType } from "@/lib/notifications/notification-service";

// Test endpoint to trigger notifications for demo purposes
// POST /api/test-notification
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const sessionData = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionData?.session || !sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, matterId } = body as { type?: NotificationType; matterId?: string };

    // Get a matter to use for the test notification
    let matter;
    if (matterId) {
      matter = await prisma.matters.findUnique({
        where: { id: matterId },
      });
    } else {
      // Get the first available matter
      matter = await prisma.matters.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }

    if (!matter) {
      return NextResponse.json(
        { error: "No matters found. Please sync with Docketwise first." },
        { status: 404 }
      );
    }

    // Send test notification
    const notificationType: NotificationType = type || "statusChange";
    
    console.log(`[TEST] Sending test ${notificationType} notification for matter: ${matter.title}`);

    const result = await sendNotification({
      type: notificationType,
      matterId: matter.id,
      matterTitle: matter.title,
      clientName: matter.clientName,
      matterType: matter.matterType,
      workflowStage: matter.status,
      status: notificationType === "rfe" ? "RFE Received" 
            : notificationType === "approval" ? "Approved"
            : notificationType === "denial" ? "Denied"
            : "Status Updated",
      oldStatus: matter.statusForFiling,
      paralegalName: matter.assignees,
      deadlineDate: matter.estimatedDeadline,
      daysRemaining: notificationType === "deadline" ? 3 : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Test ${notificationType} notification sent`,
      matter: {
        id: matter.id,
        title: matter.title,
      },
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[TEST] Error sending test notification:", error);
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

// GET endpoint to check notification system status
export async function GET(request: NextRequest) {
  try {
    const sessionData = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionData?.session || !sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get notification settings
    const settings = await prisma.notificationSettings.findFirst();
    
    // Get recipient counts
    const emailRecipients = await prisma.notificationRecipients.count({
      where: { emailEnabled: true },
    });
    const inAppRecipients = await prisma.notificationRecipients.count({
      where: { inAppEnabled: true },
    });

    // Get recent notifications
    const recentNotifications = await prisma.deadlineNotifications.count({
      where: {
        sentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // Check SMTP configuration
    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    );

    return NextResponse.json({
      status: "ok",
      settings: settings ? {
        emailRfe: settings.emailRfe,
        emailApproval: settings.emailApproval,
        emailDenial: settings.emailDenial,
        emailStatusChange: settings.emailStatusChange,
        emailDeadlines: settings.emailDeadlines,
        inAppRfe: settings.inAppRfe,
        inAppApproval: settings.inAppApproval,
        inAppDenial: settings.inAppDenial,
        inAppStatusChange: settings.inAppStatusChange,
        inAppDeadlines: settings.inAppDeadlines,
      } : "Not configured (using defaults)",
      recipients: {
        email: emailRecipients,
        inApp: inAppRecipients,
      },
      smtp: smtpConfigured ? "Configured" : "Not configured",
      recentNotifications,
      testEndpoints: {
        sendTest: "POST /api/test-notification with { type: 'rfe' | 'approval' | 'denial' | 'statusChange' | 'deadline' }",
        checkDeadlines: "POST /api/cron/check-deadlines",
      },
    });
  } catch (error) {
    console.error("[TEST] Error checking notification status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
