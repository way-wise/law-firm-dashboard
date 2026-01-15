import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  matterId: z.string(),
  userId: z.string(),
  sentAt: z.date(),
  recipientEmail: z.string().email(),
  notificationType: z.string(), // "email" or "in-app" - stored as string in DB
  daysBeforeDeadline: z.number(),
  subject: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  readAt: z.date().nullable(),
  matter: z.object({
    id: z.string(),
    title: z.string(),
    clientName: z.string().nullable(),
    estimatedDeadline: z.date().nullable(),
    paralegalAssigned: z.string().nullable(),
  }).optional(),
});

export const notificationListSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number(),
});

export const markNotificationReadSchema = z.object({
  id: z.string(),
});

export const notificationFilterSchema = z.object({
  isRead: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
