"use client";

import { createContext, useContext, useState } from "react";

// Notification Type
type NotificationType = {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  readAt: string | null;
};

// Context Type
type NotificationContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  notifications: NotificationType[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
};

// Create Context
const NotificationContext = createContext<NotificationContextType | null>(null);

// useNotification hook
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotification must be used within a NotificationProvider.",
    );
  }
  return ctx;
}

// Provider component
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Example notifications data
  const [notifications, setNotifications] = useState<NotificationType[]>([
    {
      id: 1,
      type: "ORDER",
      title: "New Order Placed",
      message:
        "Customer John Smith placed a new order (#58672) for 'Smart Watch Pro'.",
      time: "30 minutes ago",
      readAt: null,
    },
    {
      id: 2,
      type: "STOCK",
      title: "Stock Running Low",
      message:
        "Only 3 units left for '4K Action Camera'. Consider restocking soon.",
      time: "1 hour ago",
      readAt: null,
    },
    {
      id: 3,
      type: "CUSTOMER",
      title: "New Customer Signup",
      message: "A new customer, Emily Johnson, just registered on your store.",
      time: "3 hours ago",
      readAt: null,
    },
    {
      id: 4,
      type: "ORDER",
      title: "Order #58421 Shipped",
      message:
        "Your order #58421 has been shipped via FedEx and is on its way.",
      time: "5 hours ago",
      readAt: "2025-10-22T10:20:20Z",
    },
    {
      id: 5,
      type: "SALE",
      title: "New Sale Completed",
      message:
        "You’ve successfully sold 3 units of 'Wireless Bluetooth Earbuds'.",
      time: "6 hours ago",
      readAt: "2025-10-22T09:15:10Z",
    },
    {
      id: 6,
      type: "PAYMENT",
      title: "Invoice Payment Received",
      message:
        "Payment for invoice #INV-004512 has been received and processed.",
      time: "1 day ago",
      readAt: "2025-10-21T14:32:45Z",
    },
    {
      id: 7,
      type: "ORDER",
      title: "Order #58670 Delivered",
      message: "Order #58670 has been successfully delivered to the customer.",
      time: "1 day ago",
      readAt: "2025-10-21T11:25:30Z",
    },
    {
      id: 8,
      type: "REFUND",
      title: "Refund Processed",
      message:
        "Refund of $89.99 for order #58214 has been successfully issued.",
      time: "2 days ago",
      readAt: "2025-10-20T16:48:10Z",
    },
    {
      id: 9,
      type: "REPORT",
      title: "Weekly Sales Report Ready",
      message: "Your weekly performance report is now available for review.",
      time: "3 days ago",
      readAt: "2025-10-19T09:10:00Z",
    },
    {
      id: 10,
      type: "CAMPAIGN",
      title: "Discount Campaign Scheduled",
      message:
        "Your 'Black Friday Mega Sale' campaign is set to start in 2 days.",
      time: "4 days ago",
      readAt: "2025-10-18T15:00:00Z",
    },
  ]);

  // Derived unread count
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Notification Toggler
  const toggle = () => setOpen((v) => !v);

  // Mark single notification as read
  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
    );
  };

  const value: NotificationContextType = {
    open,
    setOpen,
    toggle,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
