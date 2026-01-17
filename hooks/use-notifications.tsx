"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/tanstack-query";

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications using oRPC query options
  const { data, isLoading } = useQuery(
    orpc.notifications.list.queryOptions({
      input: { limit: 50 },
      refetchInterval: 30000, // Refetch every 30 seconds as fallback
    })
  );

  // Mark as read mutation using oRPC mutation options
  const markAsReadMutation = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.queryKey({ input: { limit: 50 } }),
        });
      },
    })
  );

  // Mark all as read mutation using oRPC mutation options
  const markAllAsReadMutation = useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.notifications.list.queryKey({ input: { limit: 50 } }),
        });
      },
    })
  );

  // SSE subscription for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const sseUrl = `${baseUrl}/api/notifications/subscribe`;

        eventSource = new EventSource(sseUrl, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          console.log("[SSE] Connected to notification stream");
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "created") {
              queryClient.invalidateQueries({
                queryKey: orpc.notifications.list.queryKey({ input: { limit: 50 } }),
              });
              console.log("[SSE] New notification:", data.notification);
            }
          } catch (error) {
            console.error("[SSE] Error parsing message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("[SSE] Connection error:", error);
          setIsConnected(false);
          eventSource?.close();

          setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error("[SSE] Failed to connect:", error);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
      }
    };
  }, [queryClient]);

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    isConnected,
    markAsRead: (id: string) => markAsReadMutation.mutate({ id }),
    markAllAsRead: () => markAllAsReadMutation.mutate({}),
  };
}
