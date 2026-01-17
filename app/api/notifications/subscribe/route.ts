import { auth } from "@/lib/auth";
import { notificationPublisher } from "@/lib/notifications/publisher";

export async function GET(request: Request) {
  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });

  if (!sessionData?.session || !sessionData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const { user } = sessionData;

      try {
        const iterator = notificationPublisher.subscribe("notification:created");

        for await (const payload of iterator) {
          if (payload.userId === user.id) {
            const data = {
              type: "created",
              notification: {
                id: payload.id,
                matterId: payload.matterId,
                subject: payload.subject,
                message: payload.message,
                daysBeforeDeadline: payload.daysBeforeDeadline,
                sentAt: payload.sentAt,
              },
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }
        }
      } catch (error) {
        console.error("[SSE] Error:", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
