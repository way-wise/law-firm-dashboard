import "server-only";
import prisma from "@/lib/prisma";
import { sendDeadlineReminderEmail } from "./email";
import { publishNotificationCreated } from "./publisher";
import { addDays, startOfDay, endOfDay, differenceInDays } from "date-fns";

// Notification intervals (days before deadline)
const NOTIFICATION_INTERVALS = [7, 3, 1, 0]; // 7 days, 3 days, 1 day, on deadline day

export async function checkAndSendDeadlineNotifications() {
  console.log("[SCHEDULER] Starting deadline notification check...");

  try {
    const now = new Date();
    const today = startOfDay(now);

    // Get all matters with upcoming deadlines
    const upcomingMatters = await prisma.matters.findMany({
      where: {
        estimatedDeadline: {
          gte: today,
          lte: endOfDay(addDays(today, Math.max(...NOTIFICATION_INTERVALS))),
        },
        isStale: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`[SCHEDULER] Found ${upcomingMatters.length} matters with upcoming deadlines`);

    let notificationsSent = 0;

    for (const matter of upcomingMatters) {
      if (!matter.estimatedDeadline) continue;

      const daysUntilDeadline = differenceInDays(startOfDay(matter.estimatedDeadline), today);

      // Check if we should send a notification for this matter
      if (!NOTIFICATION_INTERVALS.includes(daysUntilDeadline)) {
        continue;
      }

      // Check if notification already sent for this interval
      const existingNotification = await prisma.deadlineNotifications.findFirst({
        where: {
          matterId: matter.id,
          daysBeforeDeadline: daysUntilDeadline,
        },
      });

      if (existingNotification) {
        console.log(`[SCHEDULER] Notification already sent for matter ${matter.id} at ${daysUntilDeadline} days`);
        continue;
      }

      // Determine recipient email (paralegal or matter owner)
      const recipientEmail = matter.user.email;
      const recipientName = matter.assignees || matter.user.name;

      // Create notification message
      const urgencyLevel = daysUntilDeadline <= 1 ? "URGENT" : daysUntilDeadline <= 3 ? "Important" : "Reminder";
      const subject = `${urgencyLevel}: Deadline in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""} - ${matter.title}`;
      const message = `The deadline for "${matter.title}" is approaching in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""}. Please ensure all necessary actions are completed.`;

      // Create in-app notification
      const inAppNotification = await prisma.deadlineNotifications.create({
        data: {
          matterId: matter.id,
          userId: matter.userId,
          recipientEmail,
          notificationType: "in-app",
          daysBeforeDeadline: daysUntilDeadline,
          subject,
          message,
          isRead: false,
        },
      });

      // Publish real-time notification event
      await publishNotificationCreated({
        id: inAppNotification.id,
        userId: matter.userId,
        matterId: matter.id,
        subject,
        message,
        daysBeforeDeadline: daysUntilDeadline,
        sentAt: inAppNotification.sentAt,
      });

      console.log(`[SCHEDULER] Created in-app notification for matter ${matter.id}`);

      // Send email notification (non-blocking)
      const matterUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/matters?matterId=${matter.id}`;
      
      sendDeadlineReminderEmail({
        to: recipientEmail,
        matterTitle: matter.title,
        clientName: matter.clientName,
        matterType: matter.matterType,
        deadlineDate: matter.estimatedDeadline,
        daysRemaining: daysUntilDeadline,
        workflowStage: matter.status,
        paralegalName: matter.assignees,
        matterUrl,
      })
        .then((success) => {
          if (success) {
            // Create email notification record
            return prisma.deadlineNotifications.create({
              data: {
                matterId: matter.id,
                userId: matter.userId,
                recipientEmail,
                notificationType: "email",
                daysBeforeDeadline: daysUntilDeadline,
                subject,
                message,
                isRead: true, // Email notifications are always "read"
              },
            });
          }
        })
        .catch((error) => {
          console.error(`[SCHEDULER] Failed to send email for matter ${matter.id}:`, error);
        });

      notificationsSent++;
    }

    console.log(`[SCHEDULER] Completed: ${notificationsSent} notifications sent`);

    return {
      success: true,
      notificationsSent,
      mattersChecked: upcomingMatters.length,
    };
  } catch (error) {
    console.error("[SCHEDULER] Error checking deadline notifications:", error);
    throw error;
  }
}
