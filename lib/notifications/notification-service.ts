import "server-only";
import prisma from "@/lib/prisma";
import { publishNotificationCreated } from "./publisher";
import { queueDeadlineReminderEmail } from "./email-queue";

// Notification types that match the settings
export type NotificationType = 
  | "rfe"
  | "approval"
  | "denial"
  | "statusChange"
  | "deadline";

// Notification data structure
interface NotificationData {
  type: NotificationType;
  matterId: string;
  matterTitle: string;
  clientName?: string | null;
  matterType?: string | null;
  workflowStage?: string | null;
  status?: string | null;
  oldStatus?: string | null;
  deadlineDate?: Date | null;
  daysRemaining?: number;
  paralegalName?: string | null;
  customMessage?: string;
}

// Get notification settings for the admin user (first user with settings)
async function getNotificationSettings() {
  const settings = await prisma.notificationSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });

  return settings || {
    emailRfe: true,
    emailApproval: true,
    emailDenial: true,
    emailStatusChange: false,
    emailDeadlines: true,
    inAppRfe: true,
    inAppApproval: true,
    inAppDenial: true,
    inAppStatusChange: true,
    inAppDeadlines: true,
  };
}

// Get recipients who should receive notifications
// Super admin always receives notifications (respecting their toggle settings)
async function getRecipients(channel: "email" | "inApp") {
  // Get regular recipients from notificationRecipients table
  const recipients = await prisma.notificationRecipients.findMany({
    where: channel === "email" 
      ? { emailEnabled: true }
      : { inAppEnabled: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  const recipientUsers = recipients.map((r) => r.user);

  // Always include super admin if they have notifications enabled
  // First check if super admin exists and has a notificationRecipients entry
  const superAdmin = await prisma.users.findFirst({
    where: { role: "super", banned: { not: true } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      notificationRecipients: {
        select: {
          emailEnabled: true,
          inAppEnabled: true,
        },
      },
    },
  });

  if (superAdmin) {
    // Check if super admin is already in the list
    const superAlreadyIncluded = recipientUsers.some((u) => u.id === superAdmin.id);
    
    if (!superAlreadyIncluded) {
      // Check if super admin has this channel enabled (or if they have no settings, default to enabled)
      const superSettings = superAdmin.notificationRecipients;
      const isChannelEnabled = channel === "email" 
        ? (superSettings?.emailEnabled ?? true)  // Default to true if no settings
        : (superSettings?.inAppEnabled ?? true); // Default to true if no settings
      
      if (isChannelEnabled) {
        recipientUsers.push({
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: superAdmin.role,
        });
      }
    }
  }

  return recipientUsers;
}

// Check if a notification type is enabled
function isNotificationEnabled(
  settings: Awaited<ReturnType<typeof getNotificationSettings>>,
  type: NotificationType,
  channel: "email" | "inApp"
): boolean {
  const key = `${channel}${type.charAt(0).toUpperCase()}${type.slice(1)}` as keyof typeof settings;
  
  // Handle the key mapping
  const keyMap: Record<string, keyof typeof settings> = {
    emailRfe: "emailRfe",
    emailApproval: "emailApproval",
    emailDenial: "emailDenial",
    emailStatusChange: "emailStatusChange",
    emailDeadline: "emailDeadlines",
    inAppRfe: "inAppRfe",
    inAppApproval: "inAppApproval",
    inAppDenial: "inAppDenial",
    inAppStatusChange: "inAppStatusChange",
    inAppDeadline: "inAppDeadlines",
  };

  const mappedKey = keyMap[key] || key;
  return settings[mappedKey] === true;
}

// Generate notification subject and message based on type
function generateNotificationContent(data: NotificationData): { subject: string; message: string } {
  switch (data.type) {
    case "rfe":
      return {
        subject: `RFE Received: ${data.matterTitle}`,
        message: `A Request for Evidence (RFE) has been received for "${data.matterTitle}"${data.clientName ? ` (Client: ${data.clientName})` : ""}. Please review and respond promptly.`,
      };
    case "approval":
      return {
        subject: `Case Approved: ${data.matterTitle}`,
        message: `Great news! The case "${data.matterTitle}"${data.clientName ? ` for ${data.clientName}` : ""} has been approved.`,
      };
    case "denial":
      return {
        subject: `Case Denied: ${data.matterTitle}`,
        message: `The case "${data.matterTitle}"${data.clientName ? ` for ${data.clientName}` : ""} has been denied. Please review the decision and consider next steps.`,
      };
    case "statusChange":
      return {
        subject: `Status Update: ${data.matterTitle}`,
        message: `The status of "${data.matterTitle}" has changed${data.oldStatus ? ` from "${data.oldStatus}"` : ""} to "${data.status || "Unknown"}".`,
      };
    case "deadline":
      return {
        subject: `Deadline Reminder: ${data.matterTitle}`,
        message: `The deadline for "${data.matterTitle}" is approaching in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}. Please ensure all necessary actions are completed.`,
      };
    default:
      return {
        subject: `Notification: ${data.matterTitle}`,
        message: data.customMessage || `An update has occurred for "${data.matterTitle}".`,
      };
  }
}

// Main function to send notifications
export async function sendNotification(data: NotificationData): Promise<{
  emailsSent: number;
  inAppCreated: number;
}> {
  const settings = await getNotificationSettings();
  const { subject, message } = generateNotificationContent(data);
  
  let emailsSent = 0;
  let inAppCreated = 0;

  // Check if in-app notifications are enabled for this type
  if (isNotificationEnabled(settings, data.type, "inApp")) {
    const inAppRecipients = await getRecipients("inApp");
    
    for (const recipient of inAppRecipients) {
      try {
        // Create in-app notification
        const notification = await prisma.deadlineNotifications.create({
          data: {
            matterId: data.matterId,
            userId: recipient.id,
            recipientEmail: recipient.email,
            notificationType: "in-app",
            daysBeforeDeadline: data.daysRemaining ?? 0,
            subject,
            message,
            isRead: false,
          },
        });

        // Publish real-time event
        await publishNotificationCreated({
          id: notification.id,
          userId: recipient.id,
          matterId: data.matterId,
          subject,
          message,
          daysBeforeDeadline: data.daysRemaining ?? 0,
          sentAt: notification.sentAt,
        });

        inAppCreated++;
        console.log(`[NOTIFICATION] In-app notification created for user ${recipient.id}`);
      } catch (error) {
        console.error(`[NOTIFICATION] Failed to create in-app notification for user ${recipient.id}:`, error);
      }
    }
  }

  // Check if email notifications are enabled for this type
  if (isNotificationEnabled(settings, data.type, "email")) {
    const emailRecipients = await getRecipients("email");
    
    for (const recipient of emailRecipients) {
      try {
        // Queue email for sending (uses bulk-friendly queue)
        const matterUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/matters?matterId=${data.matterId}`;
        
        await queueDeadlineReminderEmail({
          to: recipient.email,
          matterTitle: data.matterTitle,
          clientName: data.clientName ?? null,
          matterType: data.matterType ?? null,
          deadlineDate: data.deadlineDate ?? new Date(),
          daysRemaining: data.daysRemaining ?? 0,
          workflowStage: data.workflowStage ?? null,
          paralegalName: data.paralegalName ?? null,
          matterUrl,
        });

        // Record email notification
        await prisma.deadlineNotifications.create({
          data: {
            matterId: data.matterId,
            userId: recipient.id,
            recipientEmail: recipient.email,
            notificationType: "email",
            daysBeforeDeadline: data.daysRemaining ?? 0,
            subject,
            message,
            isRead: true, // Email notifications are always "read"
          },
        });

        emailsSent++;
        console.log(`[NOTIFICATION] Email queued for ${recipient.email}`);
      } catch (error) {
        console.error(`[NOTIFICATION] Failed to queue email for ${recipient.email}:`, error);
      }
    }
  }

  console.log(`[NOTIFICATION] Sent ${emailsSent} emails, created ${inAppCreated} in-app notifications for ${data.type}`);
  
  return { emailsSent, inAppCreated };
}

// Helper to detect notification type from status change
export function detectNotificationType(
  oldStatus: string | null | undefined,
  newStatus: string | null | undefined
): NotificationType | null {
  if (!newStatus) return null;
  
  const statusLower = newStatus.toLowerCase();
  
  // Check for RFE
  if (statusLower.includes("rfe") || statusLower.includes("request for evidence")) {
    return "rfe";
  }
  
  // Check for Approval
  if (statusLower.includes("approved") || statusLower.includes("approval")) {
    return "approval";
  }
  
  // Check for Denial
  if (statusLower.includes("denied") || statusLower.includes("denial") || statusLower.includes("rejected")) {
    return "denial";
  }
  
  // If status changed but doesn't match specific types, it's a general status change
  if (oldStatus !== newStatus) {
    return "statusChange";
  }
  
  return null;
}
