"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plug, Settings } from "lucide-react";
import { IntegrationsTab } from "./integrations-tab";
import { NotificationsTab } from "./notifications-tab";
import { PlatformTab } from "./platform-tab";

export default function SettingsTabs({ defaultTab }: { defaultTab?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and integrations
        </p>
      </div>

      <Tabs defaultValue={defaultTab || "platform"} className="w-full">
        <TabsList>
          <TabsTrigger value="platform">
            <Settings className="h-4 w-4" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <PlatformTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
