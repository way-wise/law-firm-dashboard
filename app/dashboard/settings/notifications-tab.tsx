"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail } from "lucide-react";
import { useState } from "react";

type NotificationSettings = {
  email: {
    rfe: boolean;
    approval: boolean;
    denial: boolean;
    statusChange: boolean;
    deadlines: boolean;
  };
  inApp: {
    rfe: boolean;
    approval: boolean;
    denial: boolean;
    statusChange: boolean;
    deadlines: boolean;
  };
};

export function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      rfe: true,
      approval: true,
      denial: true,
      statusChange: false,
      deadlines: true,
    },
    inApp: {
      rfe: true,
      approval: true,
      denial: true,
      statusChange: true,
      deadlines: true,
    },
  });

  const handleToggle = (type: "email" | "inApp", key: keyof NotificationSettings["email"]) => {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: !prev[type][key],
      },
    }));
  };

  const notificationTypes = [
    {
      key: "rfe" as const,
      label: "Request for Evidence (RFE)",
      description: "Get notified when an RFE is received for any matter",
    },
    {
      key: "approval" as const,
      label: "Case Approval",
      description: "Receive notifications when a case is approved",
    },
    {
      key: "denial" as const,
      label: "Case Denial",
      description: "Get alerted when a case is denied",
    },
    {
      key: "statusChange" as const,
      label: "Status Changes",
      description: "Notifications for any case status updates",
    },
    {
      key: "deadlines" as const,
      label: "Upcoming Deadlines",
      description: "Reminders for approaching deadlines and important dates",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Email Notifications</CardTitle>
              <CardDescription>
                Receive email alerts for important case updates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type) => (
            <div
              key={`email-${type.key}`}
              className="flex items-center justify-between space-x-4 rounded-lg border p-4"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={`email-${type.key}`} className="cursor-pointer font-medium">
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <Switch
                id={`email-${type.key}`}
                checked={settings.email[type.key]}
                onCheckedChange={() => handleToggle("email", type.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">In-App Notifications</CardTitle>
              <CardDescription>
                Show notifications in the dashboard
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type) => (
            <div
              key={`inApp-${type.key}`}
              className="flex items-center justify-between space-x-4 rounded-lg border p-4"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={`inApp-${type.key}`} className="cursor-pointer font-medium">
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <Switch
                id={`inApp-${type.key}`}
                checked={settings.inApp[type.key]}
                onCheckedChange={() => handleToggle("inApp", type.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
