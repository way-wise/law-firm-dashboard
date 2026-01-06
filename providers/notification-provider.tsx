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

  // Law firm notifications data
  const [notifications, setNotifications] = useState<NotificationType[]>([
    {
      id: 1,
      type: "MATTER",
      title: "New Matter Created",
      message:
        "Matter M-2024-009 (Chen Wei - H-1B Petition) has been created and assigned to you.",
      time: "30 minutes ago",
      readAt: null,
    },
    {
      id: 2,
      type: "RFE",
      title: "RFE Received",
      message:
        "USCIS issued an RFE for Matter M-2024-002 (Chen Wei - H-1B). Response due in 87 days.",
      time: "1 hour ago",
      readAt: null,
    },
    {
      id: 3,
      type: "CLIENT",
      title: "New Client Added",
      message: "A new client, Maria Santos, has been added to the system.",
      time: "3 hours ago",
      readAt: null,
    },
    {
      id: 4,
      type: "CASE_UPDATE",
      title: "Case Status Updated",
      message:
        "Matter M-2024-004 (Priya Sharma - L-1) status changed to 'Approved'.",
      time: "5 hours ago",
      readAt: "2025-10-22T10:20:20Z",
    },
    {
      id: 5,
      type: "DOCUMENT",
      title: "Documents Uploaded",
      message:
        "Client uploaded 3 documents for Matter M-2024-001 (Maria Rodriguez - I-485).",
      time: "6 hours ago",
      readAt: "2025-10-22T09:15:10Z",
    },
    {
      id: 6,
      type: "PAYMENT",
      title: "Payment Received",
      message:
        "Payment of $2,500 received for Matter M-2024-005 (Dimitri Volkov - EB-2 NIW).",
      time: "1 day ago",
      readAt: "2025-10-21T14:32:45Z",
    },
    {
      id: 7,
      type: "DEADLINE",
      title: "Upcoming Deadline",
      message: "Filing deadline for Matter M-2024-003 (Ahmed Hassan - Asylum) is in 5 days.",
      time: "1 day ago",
      readAt: "2025-10-21T11:25:30Z",
    },
    {
      id: 8,
      type: "CASE_UPDATE",
      title: "Receipt Notice Received",
      message:
        "Receipt notice EAC2490098765 received for Matter M-2024-008 (Yuki Tanaka - H-1B).",
      time: "2 days ago",
      readAt: "2025-10-20T16:48:10Z",
    },
    {
      id: 9,
      type: "TASK",
      title: "Task Assigned",
      message: "You have been assigned to review documents for Matter M-2024-006.",
      time: "3 days ago",
      readAt: "2025-10-19T09:10:00Z",
    },
    {
      id: 10,
      type: "REMINDER",
      title: "Client Meeting Reminder",
      message:
        "Consultation with John Smith scheduled for tomorrow at 2:00 PM.",
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
