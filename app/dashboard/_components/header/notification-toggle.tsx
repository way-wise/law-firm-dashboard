"use client";

import { Button } from "@/components/ui/button";
import { useNotification } from "@/providers/notification-provider";
import { LuBell } from "react-icons/lu";

const NotificationToggle = () => {
  const { toggle, unreadCount } = useNotification();

  return (
    <Button
      aria-label="Toggle sidebar"
      onClick={toggle}
      size="icon-lg"
      variant="ghost"
      className="relative"
    >
      <LuBell />

      {/* Notification Badge */}
      {unreadCount > 0 && (
        <span className="absolute top-2 right-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-primary"></span>
          </span>
        </span>
      )}
    </Button>
  );
};

export default NotificationToggle;
