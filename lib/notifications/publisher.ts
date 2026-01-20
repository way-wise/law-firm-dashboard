import "server-only";
import { EventEmitter } from "events";

// Define notification event types
export type NotificationCreatedEvent = {
  id: string;
  userId: string;
  matterId: string;
  subject: string;
  message: string;
  daysBeforeDeadline: number;
  sentAt: Date;
};

export type NotificationReadEvent = {
  id: string;
  userId: string;
};

// Global event emitter for notifications (works in single-server Next.js)
// Use globalThis to ensure singleton across hot reloads
const globalForEmitter = globalThis as unknown as {
  notificationEmitter: EventEmitter | undefined;
};

export const notificationEmitter = globalForEmitter.notificationEmitter ?? new EventEmitter();
globalForEmitter.notificationEmitter = notificationEmitter;

// Increase max listeners for many concurrent SSE connections
notificationEmitter.setMaxListeners(100);

// Helper to publish notification created event
export async function publishNotificationCreated(notification: NotificationCreatedEvent) {
  console.log(`[PUBLISHER] Emitting notification:created for user ${notification.userId}`);
  notificationEmitter.emit("notification:created", notification);
}

// Helper to publish notification read event
export async function publishNotificationRead(notificationId: string, userId: string) {
  notificationEmitter.emit("notification:read", { id: notificationId, userId });
}

// Subscribe to notification events (returns cleanup function)
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: NotificationCreatedEvent) => void
): () => void {
  const handler = (notification: NotificationCreatedEvent) => {
    if (notification.userId === userId) {
      onNotification(notification);
    }
  };
  
  notificationEmitter.on("notification:created", handler);
  console.log(`[PUBLISHER] User ${userId} subscribed to notifications`);
  
  return () => {
    notificationEmitter.off("notification:created", handler);
    console.log(`[PUBLISHER] User ${userId} unsubscribed from notifications`);
  };
}
