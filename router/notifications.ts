import "server-only";
import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { notificationFilterSchema, notificationListSchema, markNotificationReadSchema } from "@/schema/notificationSchema";
import { notificationPublisher, publishNotificationRead } from "@/lib/notifications/publisher";
import { eventIterator } from "@orpc/server";
import { z } from "zod";

// Get user's notifications
export const getNotifications = authorized
  .input(notificationFilterSchema)
  .output(notificationListSchema)
  .handler(async ({ input, context }) => {
    const { user } = context;

    const notifications = await prisma.deadlineNotifications.findMany({
      where: {
        userId: user.id,
        notificationType: "in-app",
        ...(input.isRead !== undefined ? { isRead: input.isRead } : {}),
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            clientName: true,
            estimatedDeadline: true,
            paralegalAssigned: true,
          },
        },
      },
      orderBy: {
        sentAt: "desc",
      },
      take: input.limit,
    });

    const unreadCount = await prisma.deadlineNotifications.count({
      where: {
        userId: user.id,
        notificationType: "in-app",
        isRead: false,
      },
    });

    return {
      notifications,
      unreadCount,
    };
  });

// Mark notification as read
export const markNotificationRead = authorized
  .input(markNotificationReadSchema)
  .handler(async ({ input, context }) => {
    const { user } = context;

    const notification = await prisma.deadlineNotifications.update({
      where: {
        id: input.id,
        userId: user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Publish read event for real-time updates
    await publishNotificationRead(notification.id, user.id);

    return { success: true };
  });

// Mark all notifications as read
export const markAllNotificationsRead = authorized
  .handler(async ({ context }) => {
    const { user } = context;

    await prisma.deadlineNotifications.updateMany({
      where: {
        userId: user.id,
        notificationType: "in-app",
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  });

// Real-time notification subscription using SSE
export const subscribeToNotifications = authorized
  .output(
    eventIterator(
      z.object({
        type: z.enum(["created", "read"]),
        notification: z.object({
          id: z.string(),
          matterId: z.string().optional(),
          subject: z.string().optional(),
          message: z.string().optional(),
          daysBeforeDeadline: z.number().optional(),
          sentAt: z.date().optional(),
        }),
      })
    )
  )
  .handler(async function* ({ context, signal }) {
    const { user } = context;

    try {
      // Subscribe to notification created events for this user
      const createdIterator = notificationPublisher.subscribe("notification:created", { signal });

      for await (const payload of createdIterator) {
        // Only yield notifications for this specific user
        if (payload.userId === user.id) {
          yield {
            type: "created" as const,
            notification: {
              id: payload.id,
              matterId: payload.matterId,
              subject: payload.subject,
              message: payload.message,
              daysBeforeDeadline: payload.daysBeforeDeadline,
              sentAt: payload.sentAt,
            },
          };
        }
      }
    } finally {
      console.log(`[NOTIFICATIONS] User ${user.id} disconnected from notification stream`);
    }
  });
