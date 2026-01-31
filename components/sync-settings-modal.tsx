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
  const [pollingInterval, setPollingInterval] = useState<string>("720");
  const [staleMeasurementDays, setStaleMeasurementDays] = useState<string>("10");
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
      setStaleMeasurementDays(settings.staleMeasurementDays.toString());
      setLastSyncAt(settings.lastSyncAt);
    } catch (error) {
      console.error("Error loading sync settings:", error);
      toast.error("Failed to load sync settings");
      // Keep defaults if loading fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await client.sync.updateSettings({
        pollingInterval: parseInt(pollingInterval),
        staleMeasurementDays: parseInt(staleMeasurementDays),
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
      toast.info("🔄 Starting sync...", { duration: 3000 });
      
      // Call unified sync but it will run in background
      // We'll use status polling to show progress
      client.sync.unified({}).then((result) => {
        setLastSyncAt(new Date());
        
        // Show final completion toast
        if (result.success) {
          toast.success(
            `🎉 Sync complete in ${(result.totalDuration / 1000 / 60).toFixed(1)} min`,
            { duration: 6000 }
          );
        } else {
          toast.warning("⚠️ Sync completed with some errors");
        }
      }).catch((error) => {
        console.error("Sync error:", error);
        if (error instanceof Error && error.message !== "TIMEOUT") {
          toast.error("Sync failed: " + error.message);
        }
      });
      
      // Don't wait for sync to complete - let it run in background
      // Status polling will show progress
      toast.success("✅ Sync started in background", { duration: 4000 });
      
    } catch (error) {
      console.error("Error triggering sync:", error);
      const message = error instanceof Error ? error.message : "Failed to start sync";
      toast.error(message);
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sync Configuration</DialogTitle>
          <DialogDescription>
            Configure sync settings and trigger data synchronization from Docketwise.
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
                Automatic sync interval for reference data
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staleMeasurement">Stale Matter Measurement (Days)</Label>
              <Select value={staleMeasurementDays} onValueChange={setStaleMeasurementDays}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="10">10 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="21">21 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Days before an active matter is marked as stale
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Note:</span> Full sync may take 20-60 minutes for large datasets. Progress is saved and can be resumed.
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
                <p className="text-sm font-medium">Full Sync</p>
                <p className="text-xs text-muted-foreground">
                  Sync: Types → Teams → Contacts → Matters → Details
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
