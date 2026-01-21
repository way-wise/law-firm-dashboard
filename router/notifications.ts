import "server-only";
import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { notificationFilterSchema, notificationListSchema, markNotificationReadSchema } from "@/schema/notificationSchema";
import { publishNotificationRead } from "@/lib/notifications/publisher";

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
            assignees: true,
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

