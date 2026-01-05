"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useNotification } from "@/providers/notification-provider";
import { LuX } from "react-icons/lu";
import NotificationCard from "./notification-card";

const Notification = () => {
  const { open, setOpen, notifications } = useNotification();

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent side="right" className="w-full max-w-md">
        <DrawerHeader>
          <div className="flex flex-col">
            <DrawerTitle className="text-xl font-medium">
              Notifications
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              All notification in one place
            </DrawerDescription>
          </div>
          <DrawerClose
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-lg" }),
            )}
          >
            <LuX />
          </DrawerClose>
        </DrawerHeader>
        {/* Notification list */}
        <div className="flex flex-col divide-y overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} {...notification} />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default Notification;
