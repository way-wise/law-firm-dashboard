"use client";

import { client } from "@/lib/orpc/client";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function LastSyncIndicator() {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLastSync();
  }, []);

  const loadLastSync = async () => {
    try {
      setIsLoading(true);
      const settings = await client.sync.getSettings({});
      setLastSyncAt(settings.lastSyncAt);
    } catch (error) {
      console.error("Error loading last sync:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !lastSyncAt) {
    return null;
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5" />
      <span>
        Last synced <span className="font-medium">{formatTimeAgo(lastSyncAt)}</span>
      </span>
    </div>
  );
}
