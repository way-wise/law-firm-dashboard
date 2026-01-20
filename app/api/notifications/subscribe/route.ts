import { auth } from "@/lib/auth";
import { subscribeToNotifications, NotificationCreatedEvent } from "@/lib/notifications/publisher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });

  if (!sessionData?.session || !sessionData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const { user } = sessionData;

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] User ${user.id} connected`);

      // Send initial connection message
      controller.enqueue(encoder.encode(`: connected\n\n`));

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      // Subscribe to notifications for this user
      const unsubscribe = subscribeToNotifications(user.id, (notification: NotificationCreatedEvent) => {
        console.log(`[SSE] Sending notification to user ${user.id}`);
        const data = {
          type: "created",
          notification: {
            id: notification.id,
            matterId: notification.matterId,
            subject: notification.subject,
            message: notification.message,
            daysBeforeDeadline: notification.daysBeforeDeadline,
            sentAt: notification.sentAt,
          },
        };

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error("[SSE] Error sending:", error);
          clearInterval(heartbeat);
          unsubscribe();
        }
      });

      // Store cleanup for cancel
      (controller as unknown as { cleanup: () => void }).cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        console.log(`[SSE] User ${user.id} disconnected`);
      };
    },
    cancel(controller) {
      const ctrl = controller as unknown as { cleanup?: () => void };
      ctrl.cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
