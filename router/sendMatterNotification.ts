import { authorized } from "@/lib/orpc";
import { queueNotificationEmail } from "@/lib/notifications/email-queue";
import prisma from "@/lib/prisma";
import * as z from "zod";

const sendMatterNotificationSchema = z.object({
  matterId: z.string(),
});

export const sendMatterNotification = authorized
  .route({
    method: "POST",
    path: "/matters/:matterId/send-notification",
    summary: "Manually send email notification for a matter to all recipients",
    tags: ["Matters"],
  })
  .input(sendMatterNotificationSchema)
  .output(z.object({ success: z.boolean(), message: z.string() }))
  .handler(async ({ input, context }) => {
    const { matterId } = input;

    // Handle temporary IDs (dw-{docketwiseId}) for matters not yet in database
    let matter;
    
    if (matterId.startsWith("dw-")) {
      const docketwiseId = parseInt(matterId.replace("dw-", ""));
      matter = await prisma.matters.findFirst({
        where: { 
          docketwiseId,
          userId: context.user.id,
        },
        select: {
          id: true,
          title: true,
          clientName: true,
          matterType: true,
          status: true,
          statusForFiling: true,
          assignees: true,
          billingStatus: true,
          deadline: true,
        },
      });
    } else {
      matter = await prisma.matters.findUnique({
        where: { id: matterId },
        select: {
          id: true,
          title: true,
          clientName: true,
          matterType: true,
          status: true,
          statusForFiling: true,
          assignees: true,
          billingStatus: true,
          deadline: true,
        },
      });
    }

    if (!matter) {
      return {
        success: false,
        message: "Matter not found in database. Please edit this matter first to sync it to the database.",
      };
    }

    try {
      // Get email recipients directly (bypass notification settings for manual sends)
      const recipients = await prisma.notificationRecipients.findMany({
        where: { emailEnabled: true },
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

      if (recipients.length === 0) {
        return {
          success: false,
          message: "No email recipients configured. Add recipients in Settings > Notifications.",
        };
      }

      const matterUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/matters?matterId=${matter.id}`;
      let emailsSent = 0;

      // Queue emails for all recipients (manual sends bypass notification settings)
      for (const recipient of recipients) {
        try {
          await queueNotificationEmail({
            to: recipient.user.email,
            type: "statusChange",
            subject: `Matter Update – ${matter.title}`,
            message: `A manual notification has been sent for this matter. Please review the matter details and take any necessary actions.`,
            greeting: "Hello,",
            closing: "Thank you.",
            matterTitle: matter.title,
            clientName: matter.clientName,
            matterType: matter.matterType,
            workflowStage: matter.status,
            deadlineDate: matter.deadline,
            paralegalAssigned: matter.assignees,
            billingStatus: matter.billingStatus,
            matterUrl,
          });

          // Record notification in database
          await prisma.deadlineNotifications.create({
            data: {
              matterId: matter.id,
              userId: recipient.user.id,
              recipientEmail: recipient.user.email,
              notificationType: "email",
              daysBeforeDeadline: 0,
              subject: `Matter Update – ${matter.title}`,
              message: `A manual notification has been sent for this matter.`,
              isRead: true,
            },
          });

          emailsSent++;
          console.log(`[MANUAL-NOTIFICATION] Email queued for ${recipient.user.email}`);
        } catch (error) {
          console.error(`[MANUAL-NOTIFICATION] Failed to queue email for ${recipient.user.email}:`, error);
        }
      }

      if (emailsSent > 0) {
        const emails = recipients.map(r => r.user.email).join(", ");
        return {
          success: true,
          message: `Notification sent to ${emailsSent} recipient(s): ${emails}`,
        };
      } else {
        return {
          success: false,
          message: "Failed to queue notification emails",
        };
      }
    } catch (error) {
      console.error("[SEND-NOTIFICATION] Error:", error);
      return {
        success: false,
        message: "Failed to send notification",
      };
    }
  });
