"use client";

import { useEffect, useState } from "react";
import { client } from "@/lib/orpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const result = await client.notifications.list({
        limit: 50,
      });
      return result;
    },
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await client.notifications.markRead({ id: notificationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await client.notifications.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // SSE subscription for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = async () => {
      try {
        // Get the SSE endpoint URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const sseUrl = `${baseUrl}/api/orpc/notifications.subscribe`;

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
              // New notification received - refetch
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              
              // Optional: Show toast notification
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
          
          // Reconnect after 5 seconds
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
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
  };
}
