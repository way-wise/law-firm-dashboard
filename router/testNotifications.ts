import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { publishNotificationCreated } from "@/lib/notifications/publisher";
import * as z from "zod";

// Test email notification
export const sendTestEmail = authorized
  .route({
    method: "POST",
    path: "/test-notifications/email",
    summary: "Send a test email notification",
    tags: ["Test Notifications"],
  })
  .output(z.object({ 
    success: z.boolean(), 
    message: z.string(),
    recipientCount: z.number(),
  }))
  .handler(async ({ context }) => {
    const userId = context.session?.userId;
    if (!userId) {
      return { success: false, message: "Not authenticated", recipientCount: 0 };
    }

    // Get current user's email
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return { success: false, message: "User not found", recipientCount: 0 };
    }

    // Send test email to current user
    const success = await sendNotificationEmail({
      to: user.email,
      type: "test",
      subject: "Test Email Notification",
      message: "This is a test email to verify that your email notification settings are configured correctly. If you received this email, your email notifications are working!",
      matterTitle: "Sample Matter - H1B Visa Application",
      clientName: "John Doe",
      matterType: "Immigration",
      matterUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
      isTest: true,
    });

    if (success) {
      return { 
        success: true, 
        message: `Test email sent successfully to ${user.email}`,
        recipientCount: 1,
      };
    } else {
      return { 
        success: false, 
        message: "Failed to send test email. Please check your SMTP configuration.",
        recipientCount: 0,
      };
    }
  });

// Test in-app notification
export const sendTestInApp = authorized
  .route({
    method: "POST",
    path: "/test-notifications/in-app",
    summary: "Send a test in-app notification",
    tags: ["Test Notifications"],
  })
  .output(z.object({ 
    success: z.boolean(), 
    message: z.string(),
  }))
  .handler(async ({ context }) => {
    const userId = context.session?.userId;
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    // Get current user's email
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Find a real matter to link the notification to (required by foreign key)
    const matter = await prisma.matters.findFirst({
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });

    if (!matter) {
      return { 
        success: false, 
        message: "No matters found. Please sync matters from Docketwise first.",
      };
    }

    try {
      // Create a test in-app notification
      const notification = await prisma.deadlineNotifications.create({
        data: {
          matterId: matter.id,
          userId: userId,
          recipientEmail: user?.email || "",
          notificationType: "in-app",
          daysBeforeDeadline: 0,
          subject: "🧪 Test In-App Notification",
          message: `This is a test notification to verify that your in-app notification settings are configured correctly. If you see this, your in-app notifications are working! (Sample matter: ${matter.title})`,
          isRead: false,
        },
      });

      // Publish real-time event
      await publishNotificationCreated({
        id: notification.id,
        userId: userId,
        matterId: matter.id,
        subject: "🧪 Test In-App Notification",
        message: `This is a test notification to verify that your in-app notification settings are configured correctly. If you see this, your in-app notifications are working! (Sample matter: ${matter.title})`,
        daysBeforeDeadline: 0,
        sentAt: notification.sentAt,
      });

      return { 
        success: true, 
        message: "Test in-app notification created successfully. Check your notification bell!",
      };
    } catch (error) {
      console.error("[TEST-NOTIFICATION] Failed to create test in-app notification:", error);
      return { 
        success: false, 
        message: "Failed to create test notification",
      };
    }
  });
