"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import { Bell, Mail, Loader2, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/orpc/client";
import { useState } from "react";

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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [inAppDialogOpen, setInAppDialogOpen] = useState(false);
  const [localEmailUsers, setLocalEmailUsers] = useState<Option[] | null>(null);
  const [localInAppUsers, setLocalInAppUsers] = useState<Option[] | null>(null);

  // Fetch settings from API
  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => client.notificationSettings.get(),
  });

  // Fetch available users for recipient selection
  const { data: availableUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["notification-recipients-users"],
    queryFn: () => client.notificationRecipients.getAvailableUsers(),
  });

  // Derive selected users from API data, but allow local overrides when dialog is open
  const selectedEmailUsers = localEmailUsers ?? (availableUsers || [])
    .filter((u) => u.emailEnabled)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const selectedInAppUsers = localInAppUsers ?? (availableUsers || [])
    .filter((u) => u.inAppEnabled)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const setSelectedEmailUsers = (users: Option[]) => setLocalEmailUsers(users);
  const setSelectedInAppUsers = (users: Option[]) => setLocalInAppUsers(users);

  // Update mutation for settings
  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => 
      client.notificationSettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });

  // Update email recipients mutation
  const updateEmailRecipientsMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      client.notificationRecipients.updateEmail({ userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-recipients-users"] });
      setLocalEmailUsers(null);
      setEmailDialogOpen(false);
    },
  });

  // Update in-app recipients mutation
  const updateInAppRecipientsMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      client.notificationRecipients.updateInApp({ userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-recipients-users"] });
      setLocalInAppUsers(null);
      setInAppDialogOpen(false);
    },
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    if (!settings) return;
    updateMutation.mutate({ [key]: !settings[key] });
  };

  const handleSaveEmailRecipients = () => {
    updateEmailRecipientsMutation.mutate(selectedEmailUsers.map((u) => u.value));
  };

  const handleSaveInAppRecipients = () => {
    updateInAppRecipientsMutation.mutate(selectedInAppUsers.map((u) => u.value));
  };

  // Convert users to options for multi-select
  const userOptions: Option[] = (availableUsers || []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.email})`,
  }));

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
          <div className="flex items-center justify-between">
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
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="size-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Email Recipients</DialogTitle>
                  <DialogDescription>
                    Select which users should receive email notifications
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <MultiSelect
                    options={userOptions}
                    value={selectedEmailUsers}
                    onChange={setSelectedEmailUsers}
                    placeholder="Select users..."
                    className="w-full"
                    isDisabled={isLoadingUsers}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedEmailUsers.length} user(s) selected
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEmailRecipients}
                    disabled={updateEmailRecipientsMutation.isPending}
                  >
                    {updateEmailRecipientsMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
          <div className="flex items-center justify-between">
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
            <Dialog open={inAppDialogOpen} onOpenChange={setInAppDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="size-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>In-App Recipients</DialogTitle>
                  <DialogDescription>
                    Select which users should receive in-app notifications
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <MultiSelect
                    options={userOptions}
                    value={selectedInAppUsers}
                    onChange={setSelectedInAppUsers}
                    placeholder="Select users..."
                    className="w-full"
                    isDisabled={isLoadingUsers}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedInAppUsers.length} user(s) selected
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setInAppDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveInAppRecipients}
                    disabled={updateInAppRecipientsMutation.isPending}
                  >
                    {updateInAppRecipientsMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
