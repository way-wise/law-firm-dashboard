"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { client } from "@/lib/orpc/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "./ui/label";

interface SyncSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POLLING_OPTIONS = [
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
];

export function SyncSettingsModal({ open, onOpenChange }: SyncSettingsModalProps) {
  const [pollingInterval, setPollingInterval] = useState<string>("30");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await client.sync.getSettings({});
      setPollingInterval(settings.pollingInterval.toString());
      setLastSyncAt(settings.lastSyncAt);
    } catch (error) {
      console.error("Error loading sync settings:", error);
      toast.error("Failed to load sync settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await client.sync.updateSettings({
        pollingInterval: parseInt(pollingInterval),
      });
      toast.success("Sync settings updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving sync settings:", error);
      toast.error("Failed to save sync settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      toast.info("Sync started. This may take a few minutes for large datasets...");
      
      // Add timeout to prevent infinite loading (10 minutes max for large datasets)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), 10 * 60 * 1000);
      });
      
      const result = await Promise.race([
        client.sync.trigger({}),
        timeoutPromise,
      ]);
      
      setLastSyncAt(new Date());
      toast.success(
        `Sync completed: ${result.recordsProcessed} records processed`
      );
    } catch (error) {
      console.error("Error triggering sync:", error);
      if (error instanceof Error && error.message === "TIMEOUT") {
        // Sync likely completed on backend but response timed out
        toast.warning("Sync is taking longer than expected. It may have completed - please refresh the page to check.");
        setLastSyncAt(new Date()); // Assume it completed
      } else {
        const message = error instanceof Error ? error.message : "Failed to sync data";
        toast.error(message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sync Configuration</DialogTitle>
          <DialogDescription>
            Configure how often data is synced from Docketwise
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Polling Interval</Label>
              <Select value={pollingInterval} onValueChange={setPollingInterval}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {POLLING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to automatically sync data from Docketwise
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Note:</span> More frequent polling intervals may impact server resources and API rate limits.
              </p>
            </div>

            {lastSyncAt && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Last synced:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(lastSyncAt).toLocaleString()}
                  </span>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Manual Sync</p>
                <p className="text-xs text-muted-foreground">
                  Trigger an immediate sync
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                isLoading={isSyncing}
              >
                Sync Now
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving} disabled={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
