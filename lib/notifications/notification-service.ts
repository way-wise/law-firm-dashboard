import "server-only";
import prisma from "@/lib/prisma";
import { publishNotificationCreated } from "./publisher";
import { queueNotificationEmail } from "./email-queue";

// Notification types that match the settings
export type NotificationType = 
  | "rfe"
  | "approval"
  | "denial"
  | "statusChange"
  | "deadline"
  | "pastDeadline"
  | "workflowChange"
  | "billingChange";

// Notification data structure
interface NotificationData {
  type: NotificationType;
  matterId: string;
  matterTitle: string;
  clientName?: string | null;
  matterType?: string | null;
  workflowStage?: string | null;
  oldWorkflowStage?: string | null;
  status?: string | null;
  oldStatus?: string | null;
  billingStatus?: string | null;
  oldBillingStatus?: string | null;
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
// Only users explicitly added to notificationRecipients table will receive notifications
async function getRecipients(channel: "email" | "inApp") {
  // Get recipients from notificationRecipients table only
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

  return recipients.map((r) => r.user);
}

// Check if any recipients are configured for notifications
// Used by sync service to skip notifications if no one will receive them
export async function hasConfiguredRecipients(): Promise<{ email: boolean; inApp: boolean }> {
  const [emailCount, inAppCount] = await Promise.all([
    prisma.notificationRecipients.count({ where: { emailEnabled: true } }),
    prisma.notificationRecipients.count({ where: { inAppEnabled: true } }),
  ]);
  
  return {
    email: emailCount > 0,
    inApp: inAppCount > 0,
  };
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

// Generate notification content - separate email and in-app formats
function generateNotificationContent(data: NotificationData): { 
  subject: string; 
  emailMessage: string; 
  inAppMessage: string;
  emailGreeting: string;
  emailClosing: string;
} {
  const matterType = data.matterType || "matter";
  const clientName = data.clientName || "the client";
  
  switch (data.type) {
    case "pastDeadline":
      return {
        subject: `Action Required – Past Deadline`,
        emailGreeting: "Hello,",
        emailMessage: `The ${matterType} for ${clientName} is past the set deadline. Please provide an explanation as to why this filing has not yet been completed.`,
        emailClosing: "Thank you.",
        inAppMessage: `The ${matterType} for ${clientName} is past the set deadline. Please review immediately.`,
      };
    case "deadline":
      return {
        subject: `Deadline Approaching – ${data.daysRemaining} Day${data.daysRemaining !== 1 ? "s" : ""} Remaining`,
        emailGreeting: "Hello,",
        emailMessage: `The ${matterType} for ${clientName} has a deadline approaching in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}. Please ensure all necessary actions are completed before the deadline.`,
        emailClosing: "Thank you.",
        inAppMessage: `The ${matterType} for ${clientName} has a deadline in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}.`,
      };
    case "workflowChange":
      return {
        subject: `Workflow Stage Updated – ${data.matterTitle}`,
        emailGreeting: "Hello,",
        emailMessage: `The workflow stage for the ${matterType} for ${clientName} has been updated${data.oldWorkflowStage ? ` from "${data.oldWorkflowStage}"` : ""} to "${data.workflowStage || "Unknown"}". Please review and take any necessary actions.`,
        emailClosing: "Thank you.",
        inAppMessage: `Workflow stage changed to "${data.workflowStage}" for ${matterType} (${clientName}).`,
      };
    case "billingChange":
      return {
        subject: `Billing Status Updated – ${data.matterTitle}`,
        emailGreeting: "Hello,",
        emailMessage: `The billing status for the ${matterType} for ${clientName} has been updated${data.oldBillingStatus ? ` from "${data.oldBillingStatus}"` : ""} to "${data.billingStatus || "Unknown"}".`,
        emailClosing: "Thank you.",
        inAppMessage: `Billing status changed to "${data.billingStatus}" for ${matterType} (${clientName}).`,
      };
    case "statusChange":
      return {
        subject: `Status Update – ${data.matterTitle}`,
        emailGreeting: "Hello,",
        emailMessage: `The status of the ${matterType} for ${clientName} has been updated${data.oldStatus ? ` from "${data.oldStatus}"` : ""} to "${data.status || "Unknown"}". Please review and take any necessary actions.`,
        emailClosing: "Thank you.",
        inAppMessage: `Status changed to "${data.status}" for ${matterType} (${clientName}).`,
      };
    case "rfe":
      return {
        subject: `Action Required – RFE Received`,
        emailGreeting: "Hello,",
        emailMessage: `A Request for Evidence (RFE) has been received for the ${matterType} for ${clientName}. Please review and respond promptly to avoid any delays.`,
        emailClosing: "Thank you.",
        inAppMessage: `RFE received for ${matterType} (${clientName}). Please respond promptly.`,
      };
    case "approval":
      return {
        subject: `Case Approved – ${data.matterTitle}`,
        emailGreeting: "Hello,",
        emailMessage: `Great news! The ${matterType} for ${clientName} has been approved. Please proceed with any final steps as needed.`,
        emailClosing: "Thank you.",
        inAppMessage: `Case approved: ${matterType} for ${clientName}.`,
      };
    case "denial":
      return {
        subject: `Case Denied – ${data.matterTitle}`,
        emailGreeting: "Hello,",
        emailMessage: `The ${matterType} for ${clientName} has been denied. Please review the decision and consider next steps, including any appeal options.`,
        emailClosing: "Thank you.",
        inAppMessage: `Case denied: ${matterType} for ${clientName}. Please review.`,
      };
    default:
      return {
        subject: `Notification – ${data.matterTitle}`,
        emailGreeting: "Hello,",
        emailMessage: data.customMessage || `An update has occurred for the ${matterType} for ${clientName}.`,
        emailClosing: "Thank you.",
        inAppMessage: data.customMessage || `Update for ${matterType} (${clientName}).`,
      };
  }
}

// Main function to send notifications
export async function sendNotification(data: NotificationData): Promise<{
  emailsSent: number;
  inAppCreated: number;
}> {
  const settings = await getNotificationSettings();
  const content = generateNotificationContent(data);
  
  let emailsSent = 0;
  let inAppCreated = 0;

  // Map new notification types to existing settings (use statusChange for workflow/billing)
  const effectiveType = ["workflowChange", "billingChange", "pastDeadline"].includes(data.type) 
    ? (data.type === "pastDeadline" ? "deadline" : "statusChange") as NotificationType
    : data.type;

  // Check if in-app notifications are enabled for this type
  if (isNotificationEnabled(settings, effectiveType, "inApp")) {
    const inAppRecipients = await getRecipients("inApp");
    
    for (const recipient of inAppRecipients) {
      try {
        const notification = await prisma.deadlineNotifications.create({
          data: {
            matterId: data.matterId,
            userId: recipient.id,
            recipientEmail: recipient.email,
            notificationType: "in-app",
            daysBeforeDeadline: data.daysRemaining ?? 0,
            subject: content.subject,
            message: content.inAppMessage,
            isRead: false,
          },
        });

        await publishNotificationCreated({
          id: notification.id,
          userId: recipient.id,
          matterId: data.matterId,
          subject: content.subject,
          message: content.inAppMessage,
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
  const emailEnabled = isNotificationEnabled(settings, effectiveType, "email");
  console.log(`[NOTIFICATION] Email enabled for ${data.type} (effective: ${effectiveType})? ${emailEnabled}`);
  
  if (emailEnabled) {
    const emailRecipients = await getRecipients("email");
    console.log(`[NOTIFICATION] Found ${emailRecipients.length} email recipients:`, emailRecipients.map(r => r.email));
    
    const matterUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/matters?matterId=${data.matterId}`;
    
    if (emailRecipients.length === 0) {
      console.warn(`[NOTIFICATION] No email recipients configured! Add recipients in Settings → Notifications.`);
    }
    
    for (const recipient of emailRecipients) {
      try {
        // Queue email for background processing (non-blocking)
        await queueNotificationEmail({
          to: recipient.email,
          type: data.type === "pastDeadline" ? "deadline" : data.type as "rfe" | "approval" | "denial" | "statusChange" | "deadline",
          subject: content.subject,
          message: content.emailMessage,
          greeting: content.emailGreeting,
          closing: content.emailClosing,
          matterTitle: data.matterTitle,
          clientName: data.clientName,
          matterType: data.matterType,
          workflowStage: data.workflowStage,
          deadlineDate: data.deadlineDate,
          paralegalAssigned: data.paralegalName,
          billingStatus: data.billingStatus,
          matterUrl,
        });

        // Record notification in database
        await prisma.deadlineNotifications.create({
          data: {
            matterId: data.matterId,
            userId: recipient.id,
            recipientEmail: recipient.email,
            notificationType: "email",
            daysBeforeDeadline: data.daysRemaining ?? 0,
            subject: content.subject,
            message: content.emailMessage,
            isRead: true,
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
// Used by SYNC to determine if an email should be sent
// Only returns a type for significant status changes: RFE, approval, denial
// Generic status changes during sync should NOT trigger emails (too noisy)
// Manual matter updates use detectMatterChanges() which handles all notification types
export function detectNotificationType(
  oldStatus: string | null | undefined,
  newStatus: string | null | undefined
): NotificationType | null {
  if (!newStatus) return null;
  
  const statusLower = newStatus.toLowerCase();
  
  // Only send sync notifications for these significant status changes:
  if (statusLower.includes("rfe") || statusLower.includes("request for evidence")) {
    return "rfe";
  }
  
  if (statusLower.includes("approved") || statusLower.includes("approval")) {
    return "approval";
  }
  
  if (statusLower.includes("denied") || statusLower.includes("denial") || statusLower.includes("rejected")) {
    return "denial";
  }
  
  // Do NOT return "statusChange" for sync - it causes too many emails
  // Generic status changes are only notified via manual matter updates
  return null;
}

// Matter change data for detecting field changes
interface MatterChangeData {
  matterId: string;
  matterTitle: string;
  clientName?: string | null;
  matterType?: string | null;
  paralegalAssigned?: string | null;
  // Current values
  status?: string | null;
  workflowStage?: string | null;
  billingStatus?: string | null;
  estimatedDeadline?: Date | null;
  actualDeadline?: Date | null;
  // Previous values
  oldStatus?: string | null;
  oldWorkflowStage?: string | null;
  oldBillingStatus?: string | null;
  oldEstimatedDeadline?: Date | null;
  oldActualDeadline?: Date | null;
}

// Check if a deadline is past
function isDeadlinePast(deadline: Date | null | undefined): boolean {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

// Check if deadline is approaching (within N days)
function getDaysUntilDeadline(deadline: Date | null | undefined): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Check if deadline was just added or changed
function isDeadlineChanged(
  oldDeadline: Date | null | undefined,
  newDeadline: Date | null | undefined
): boolean {
  if (!newDeadline) return false;
  if (!oldDeadline) return true; // New deadline added
  
  const oldDate = new Date(oldDeadline);
  const newDate = new Date(newDeadline);
  oldDate.setHours(0, 0, 0, 0);
  newDate.setHours(0, 0, 0, 0);
  
  return oldDate.getTime() !== newDate.getTime();
}

// Detect and send notifications for matter field changes
// SIMPLIFIED: Only send emails for status, deadline (within 7 days), or billing changes
export async function checkMatterChangesAndNotify(data: MatterChangeData): Promise<void> {
  // Check if any recipients are configured - skip if no one will receive notifications
  const recipients = await hasConfiguredRecipients();
  if (!recipients.email && !recipients.inApp) {
    console.log(`[NOTIFICATION] Skipping notifications - no recipients configured`);
    return;
  }

  const notifications: Array<{ type: NotificationType; data: NotificationData }> = [];

  // 1. STATUS CHANGE - Always notify
  if (data.oldStatus !== data.status && data.status) {
    notifications.push({
      type: "statusChange",
      data: {
        type: "statusChange",
        matterId: data.matterId,
        matterTitle: data.matterTitle,
        clientName: data.clientName,
        matterType: data.matterType,
        status: data.status,
        oldStatus: data.oldStatus,
        paralegalName: data.paralegalAssigned,
      },
    });
  }

  // 2. DEADLINE CHANGE - Only if new deadline is within 7 days
  const estimatedDeadlineChanged = isDeadlineChanged(data.oldEstimatedDeadline, data.estimatedDeadline);
  if (estimatedDeadlineChanged && data.estimatedDeadline) {
    const daysUntil = getDaysUntilDeadline(data.estimatedDeadline);
    // Only send if deadline is within 7 days or past due
    if (daysUntil !== null && daysUntil <= 7) {
      notifications.push({
        type: isDeadlinePast(data.estimatedDeadline) ? "pastDeadline" : "deadline",
        data: {
          type: isDeadlinePast(data.estimatedDeadline) ? "pastDeadline" : "deadline",
          matterId: data.matterId,
          matterTitle: data.matterTitle,
          clientName: data.clientName,
          matterType: data.matterType,
          deadlineDate: data.estimatedDeadline,
          daysRemaining: daysUntil,
          paralegalName: data.paralegalAssigned,
          billingStatus: data.billingStatus,
        },
      });
    }
  }

  const actualDeadlineChanged = isDeadlineChanged(data.oldActualDeadline, data.actualDeadline);
  if (actualDeadlineChanged && data.actualDeadline) {
    const daysUntil = getDaysUntilDeadline(data.actualDeadline);
    // Only send if deadline is within 7 days or past due
    if (daysUntil !== null && daysUntil <= 7) {
      notifications.push({
        type: isDeadlinePast(data.actualDeadline) ? "pastDeadline" : "deadline",
        data: {
          type: isDeadlinePast(data.actualDeadline) ? "pastDeadline" : "deadline",
          matterId: data.matterId,
          matterTitle: data.matterTitle,
          clientName: data.clientName,
          matterType: data.matterType,
          deadlineDate: data.actualDeadline,
          daysRemaining: daysUntil,
          paralegalName: data.paralegalAssigned,
          billingStatus: data.billingStatus,
        },
      });
    }
  }

  // 3. BILLING STATUS CHANGE - Always notify
  if (data.oldBillingStatus !== data.billingStatus && data.billingStatus) {
    notifications.push({
      type: "billingChange",
      data: {
        type: "billingChange",
        matterId: data.matterId,
        matterTitle: data.matterTitle,
        clientName: data.clientName,
        matterType: data.matterType,
        billingStatus: data.billingStatus,
        oldBillingStatus: data.oldBillingStatus,
        paralegalName: data.paralegalAssigned,
      },
    });
  }

  // Send all notifications (don't await to avoid blocking)
  for (const notification of notifications) {
    sendNotification(notification.data).catch((err) => {
      console.error(`[NOTIFICATION] Failed to send ${notification.type} notification:`, err);
    });
  }
}

// Export type for external use
export type { NotificationData };
