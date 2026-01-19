"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/orpc/client";

type NotificationSettings = {
  emailRfe: boolean;
  emailApproval: boolean;
  emailDenial: boolean;
  emailStatusChange: boolean;
  emailDeadlines: boolean;
  inAppRfe: boolean;
  inAppApproval: boolean;
  inAppDenial: boolean;
  inAppStatusChange: boolean;
  inAppDeadlines: boolean;
};

export function NotificationsTab() {
  const queryClient = useQueryClient();

  // Fetch settings from API
  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => client.notificationSettings.get(),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => 
      client.notificationSettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    if (!settings) return;
    updateMutation.mutate({ [key]: !settings[key] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const emailNotifications = [
    { key: "emailRfe" as const, label: "Request for Evidence (RFE)", description: "Get notified when an RFE is received for any matter" },
    { key: "emailApproval" as const, label: "Case Approval", description: "Receive notifications when a case is approved" },
    { key: "emailDenial" as const, label: "Case Denial", description: "Get alerted when a case is denied" },
    { key: "emailStatusChange" as const, label: "Status Changes", description: "Notifications for any case status updates" },
    { key: "emailDeadlines" as const, label: "Upcoming Deadlines", description: "Reminders for approaching deadlines and important dates" },
  ];

  const inAppNotifications = [
    { key: "inAppRfe" as const, label: "Request for Evidence (RFE)", description: "Get notified when an RFE is received for any matter" },
    { key: "inAppApproval" as const, label: "Case Approval", description: "Receive notifications when a case is approved" },
    { key: "inAppDenial" as const, label: "Case Denial", description: "Get alerted when a case is denied" },
    { key: "inAppStatusChange" as const, label: "Status Changes", description: "Notifications for any case status updates" },
    { key: "inAppDeadlines" as const, label: "Upcoming Deadlines", description: "Reminders for approaching deadlines and important dates" },
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
          {emailNotifications.map((type) => (
            <div
              key={type.key}
              className="flex items-center justify-between space-x-4 rounded-lg border p-4"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={type.key} className="cursor-pointer font-medium">
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <Switch
                id={type.key}
                checked={settings?.[type.key] ?? false}
                onCheckedChange={() => handleToggle(type.key)}
                disabled={updateMutation.isPending}
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
          {inAppNotifications.map((type) => (
            <div
              key={type.key}
              className="flex items-center justify-between space-x-4 rounded-lg border p-4"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor={type.key} className="cursor-pointer font-medium">
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <Switch
                id={type.key}
                checked={settings?.[type.key] ?? false}
                onCheckedChange={() => handleToggle(type.key)}
                disabled={updateMutation.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
