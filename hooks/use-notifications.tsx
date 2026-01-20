"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/tanstack-query";

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const queryKey = orpc.notifications.list.queryKey({ input: { limit: 50 } });

  const { data, isLoading } = useQuery(
    orpc.notifications.list.queryOptions({
      input: { limit: 50 },
      refetchInterval: 30000,
    })
  );

  const markAsReadMutation = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey) as typeof data;
        if (previous) {
          queryClient.setQueryData(queryKey, {
            ...previous,
            notifications: previous.notifications.map(n => 
              n.id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, previous.unreadCount - 1),
          });
        }
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    })
  );

  const markAllAsReadMutation = useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey) as typeof data;
        if (previous) {
          queryClient.setQueryData(queryKey, {
            ...previous,
            notifications: previous.notifications.map(n => ({ ...n, isRead: true })),
            unreadCount: 0,
          });
        }
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    })
  );

  // SSE subscription for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const sseUrl = `${baseUrl}/api/notifications/subscribe`;

        eventSource = new EventSource(sseUrl, { withCredentials: true });

        eventSource.onopen = () => {
          console.log("[SSE] Connected");
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);
            if (eventData.type === "created") {
              // Immediately refetch notifications for real-time bell update
              queryClient.invalidateQueries({ 
                queryKey: orpc.notifications.list.queryKey({ input: { limit: 50 } }) 
              });
            }
          } catch (error) {
            console.error("[SSE] Parse error:", error);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error("[SSE] Connect error:", error);
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setIsConnected(false);
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
