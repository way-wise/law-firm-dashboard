import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import * as z from "zod";

const notificationSettingsSchema = z.object({
  emailRfe: z.boolean(),
  emailApproval: z.boolean(),
  emailDenial: z.boolean(),
  emailStatusChange: z.boolean(),
  emailDeadlines: z.boolean(),
  inAppRfe: z.boolean(),
  inAppApproval: z.boolean(),
  inAppDenial: z.boolean(),
  inAppStatusChange: z.boolean(),
  inAppDeadlines: z.boolean(),
});

// Get notification settings for current user
export const getNotificationSettings = authorized
  .route({
    method: "GET",
    path: "/notification-settings",
    summary: "Get notification settings for current user",
    tags: ["Notification Settings"],
  })
  .output(notificationSettingsSchema)
  .handler(async ({ context }) => {
    const userId = context.user.id;

    // Get or create default settings
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    return {
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
    };
  });

// Update notification settings
export const updateNotificationSettings = authorized
  .route({
    method: "PATCH",
    path: "/notification-settings",
    summary: "Update notification settings for current user",
    tags: ["Notification Settings"],
  })
  .input(notificationSettingsSchema.partial())
  .output(notificationSettingsSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id;

    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...input,
      },
      update: input,
    });

    return {
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
    };
  });
