import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import * as z from "zod";

const recipientSchema = z.object({
  id: z.string(),
  userId: z.string(),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

// Get all notification recipients with user info
export const getNotificationRecipients = authorized
  .route({
    method: "GET",
    path: "/notification-recipients",
    summary: "Get all notification recipients",
    tags: ["Notification Recipients"],
  })
  .output(z.array(recipientSchema))
  .handler(async () => {
    const recipients = await prisma.notificationRecipients.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return recipients;
  });

// Get all users available for notification (for multi-select dropdown)
// All users including admin can opt-in/opt-out of notifications
export const getAvailableUsers = authorized
  .route({
    method: "GET",
    path: "/notification-recipients/available-users",
    summary: "Get all users available for notifications",
    tags: ["Notification Recipients"],
  })
  .output(z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    emailEnabled: z.boolean(),
    inAppEnabled: z.boolean(),
  })))
  .handler(async () => {
    // Get all users from the system - admin can opt-in/opt-out like everyone else
    const users = await prisma.users.findMany({
      where: { 
        banned: { not: true },
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationRecipients: {
          select: {
            emailEnabled: true,
            inAppEnabled: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Map users with their notification status
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      emailEnabled: user.notificationRecipients?.emailEnabled ?? false,
      inAppEnabled: user.notificationRecipients?.inAppEnabled ?? false,
    }));
  });

// Update email recipients (bulk update)
export const updateEmailRecipients = authorized
  .route({
    method: "POST",
    path: "/notification-recipients/email",
    summary: "Update which users receive email notifications",
    tags: ["Notification Recipients"],
  })
  .input(z.object({
    userIds: z.array(z.string()),
  }))
  .output(z.object({ success: z.boolean(), count: z.number() }))
  .handler(async ({ input }) => {
    const { userIds } = input;

    // Get all users
    const allUsers = await prisma.users.findMany({
      where: { banned: { not: true } },
      select: { id: true },
    });

    // Update or create recipients for selected users (enable email)
    for (const userId of userIds) {
      await prisma.notificationRecipients.upsert({
        where: { userId },
        create: {
          userId,
          emailEnabled: true,
          inAppEnabled: false,
        },
        update: {
          emailEnabled: true,
        },
      });
    }

    // Disable email for users not in the list
    const disabledUserIds = allUsers
      .map((u) => u.id)
      .filter((id) => !userIds.includes(id));

    for (const userId of disabledUserIds) {
      const existing = await prisma.notificationRecipients.findUnique({
        where: { userId },
      });

      if (existing) {
        await prisma.notificationRecipients.update({
          where: { userId },
          data: { emailEnabled: false },
        });
      }
    }

    return { success: true, count: userIds.length };
  });

// Update in-app recipients (bulk update)
export const updateInAppRecipients = authorized
  .route({
    method: "POST",
    path: "/notification-recipients/in-app",
    summary: "Update which users receive in-app notifications",
    tags: ["Notification Recipients"],
  })
  .input(z.object({
    userIds: z.array(z.string()),
  }))
  .output(z.object({ success: z.boolean(), count: z.number() }))
  .handler(async ({ input }) => {
    const { userIds } = input;

    // Get all users
    const allUsers = await prisma.users.findMany({
      where: { banned: { not: true } },
      select: { id: true },
    });

    // Update or create recipients for selected users (enable in-app)
    for (const userId of userIds) {
      await prisma.notificationRecipients.upsert({
        where: { userId },
        create: {
          userId,
          emailEnabled: false,
          inAppEnabled: true,
        },
        update: {
          inAppEnabled: true,
        },
      });
    }

    // Disable in-app for users not in the list
    const disabledUserIds = allUsers
      .map((u) => u.id)
      .filter((id) => !userIds.includes(id));

    for (const userId of disabledUserIds) {
      const existing = await prisma.notificationRecipients.findUnique({
        where: { userId },
      });

      if (existing) {
        await prisma.notificationRecipients.update({
          where: { userId },
          data: { inAppEnabled: false },
        });
      }
    }

    return { success: true, count: userIds.length };
  });

// Initialize all users as recipients (for first-time setup)
export const initializeRecipients = authorized
  .route({
    method: "POST",
    path: "/notification-recipients/initialize",
    summary: "Initialize all users as notification recipients",
    tags: ["Notification Recipients"],
  })
  .output(z.object({ success: z.boolean(), count: z.number() }))
  .handler(async () => {
    const users = await prisma.users.findMany({
      where: { banned: { not: true } },
      select: { id: true },
    });

    let count = 0;
    for (const user of users) {
      await prisma.notificationRecipients.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          emailEnabled: true,
          inAppEnabled: true,
        },
        update: {},
      });
      count++;
    }

    return { success: true, count };
  });
