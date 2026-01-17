import "server-only";
import { MemoryPublisher } from "@orpc/experimental-publisher/memory";

/**
 * Notification Publisher for real-time SSE notifications
 * 
 * IMPORTANT: MemoryPublisher only works for single-server deployments.
 * For production with multiple server instances, replace with:
 * 
 * import { IORedisPublisher } from "@orpc/experimental-publisher/ioredis";
 * import Redis from "ioredis";
 * 
 * const redis = new Redis(process.env.REDIS_URL);
 * export const notificationPublisher = new IORedisPublisher<NotificationEvents>(redis, {
 *   resumeRetentionSeconds: 60 * 5,
 * });
 * 
 * Or use UpstashRedisPublisher for serverless:
 * import { UpstashRedisPublisher } from "@orpc/experimental-publisher/upstash-redis";
 */

// Define notification event types
export type NotificationEvents = {
  "notification:created": {
    id: string;
    userId: string;
    matterId: string;
    subject: string;
    message: string;
    daysBeforeDeadline: number;
    sentAt: Date;
  };
  "notification:read": {
    id: string;
    userId: string;
  };
} & Record<string, object>;

// Create a singleton publisher instance
// For production with multiple servers, use IORedisPublisher or UpstashRedisPublisher
export const notificationPublisher = new MemoryPublisher<NotificationEvents>({
  resumeRetentionSeconds: 60 * 5, // Retain events for 5 minutes to support resume
});

// Helper to publish notification created event
export async function publishNotificationCreated(notification: NotificationEvents["notification:created"]) {
  await notificationPublisher.publish("notification:created", notification);
}

// Helper to publish notification read event
export async function publishNotificationRead(notificationId: string, userId: string) {
  await notificationPublisher.publish("notification:read", { id: notificationId, userId });
}
