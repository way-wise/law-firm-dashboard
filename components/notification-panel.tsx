"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Clock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="mx-auto size-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          No notifications yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div>
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs"
          >
            <CheckCheck className="size-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <Separator />

      {/* Notifications List */}
      <div className="h-[400px] overflow-y-auto">
        <div className="flex flex-col">
          {notifications.map((notification) => (
            <div key={notification.id}>
              <div
                className={cn(
                  "p-4 hover:bg-accent/50 transition-colors cursor-pointer relative",
                  !notification.isRead && "bg-accent/30"
                )}
                onClick={() => {
                  if (!notification.isRead) {
                    markAsRead(notification.id);
                  }
                  // TODO: Navigate to matter details
                  // router.push(`/dashboard/matters?matterId=${notification.matterId}`);
                }}
              >
                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 size-2 bg-blue-500 rounded-full" />
                )}

                <div className="ml-3">
                  {/* Subject */}
                  {notification.subject && (
                    <p className="text-sm font-medium leading-tight">
                      {notification.subject}
                    </p>
                  )}

                  {/* Message */}
                  {notification.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  )}

                  {/* Deadline info */}
                  {notification.daysBeforeDeadline !== undefined && notification.sentAt && (
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {notification.daysBeforeDeadline === 0
                          ? "Today"
                          : `${notification.daysBeforeDeadline} day${notification.daysBeforeDeadline !== 1 ? "s" : ""} remaining`}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.sentAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full text-xs">
          View all notifications
        </Button>
      </div>
    </div>
  );
}
