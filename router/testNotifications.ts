import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { publishNotificationCreated } from "@/lib/notifications/publisher";
import * as z from "zod";

// Get email recipients from notificationRecipients table
async function getEmailRecipients() {
  const recipients = await prisma.notificationRecipients.findMany({
    where: { emailEnabled: true },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
  return recipients.map((r) => r.user);
}

// Get in-app recipients from notificationRecipients table
async function getInAppRecipients() {
  const recipients = await prisma.notificationRecipients.findMany({
    where: { inAppEnabled: true },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
  return recipients.map((r) => r.user);
}

// Test email notification - sends to all configured email recipients
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

    const recipients = await getEmailRecipients();
    
    if (recipients.length === 0) {
      return { 
        success: false, 
        message: "No email recipients configured. Add users in Settings > Notifications.",
        recipientCount: 0,
      };
    }

    let successCount = 0;
    const failedEmails: string[] = [];

    // Send to all configured recipients (don't wait for failures)
    for (const recipient of recipients) {
      try {
        const success = await sendNotificationEmail({
          to: recipient.email,
          type: "test",
          subject: "Test Email Notification",
          message: "This is a test email to verify that your email notification settings are configured correctly.",
          matterTitle: "Sample Matter - H1B Visa Application",
          clientName: "John Doe",
          matterType: "Immigration",
          matterUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
          isTest: true,
        });
        if (success) successCount++;
        else failedEmails.push(recipient.email);
      } catch {
        failedEmails.push(recipient.email);
      }
    }

    if (successCount > 0) {
      const emails = recipients.map(r => r.email).join(", ");
      return { 
        success: true, 
        message: `Test email sent to ${successCount} recipient(s): ${emails}`,
        recipientCount: successCount,
      };
    } else {
      return { 
        success: false, 
        message: "Failed to send test emails. Check SMTP configuration.",
        recipientCount: 0,
      };
    }
  });

// Test in-app notification - sends to configured recipients AND the current user
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
    recipientCount: z.number().optional(),
  }))
  .handler(async ({ context }) => {
    const userId = context.session?.userId;
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    // Get current user info
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!currentUser) {
      return { success: false, message: "User not found" };
    }

    // Get configured recipients
    const configuredRecipients = await getInAppRecipients();
    
    // Always include current user so they can see the test (merge and dedupe)
    const recipientIds = new Set(configuredRecipients.map(r => r.id));
    const recipients = [...configuredRecipients];
    if (!recipientIds.has(currentUser.id)) {
      recipients.push(currentUser);
    }

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

    let successCount = 0;

    for (const recipient of recipients) {
      try {
        const notification = await prisma.deadlineNotifications.create({
          data: {
            matterId: matter.id,
            userId: recipient.id,
            recipientEmail: recipient.email,
            notificationType: "in-app",
            daysBeforeDeadline: 0,
            subject: "🧪 Test In-App Notification",
            message: `This is a test notification. If you see this, your in-app notifications are working! (Sample matter: ${matter.title})`,
            isRead: false,
          },
        });

        await publishNotificationCreated({
          id: notification.id,
          userId: recipient.id,
          matterId: matter.id,
          subject: "🧪 Test In-App Notification",
          message: `This is a test notification. If you see this, your in-app notifications are working! (Sample matter: ${matter.title})`,
          daysBeforeDeadline: 0,
          sentAt: notification.sentAt,
        });

        successCount++;
      } catch (error) {
        console.error(`[TEST-NOTIFICATION] Failed for user ${recipient.id}:`, error);
      }
    }

    if (successCount > 0) {
      return { 
        success: true, 
        message: `Test notification sent to ${successCount} recipient(s). Check your notification bell!`,
        recipientCount: successCount,
      };
    } else {
      return { 
        success: false, 
        message: "Failed to create test notifications.",
      };
    }
  });
