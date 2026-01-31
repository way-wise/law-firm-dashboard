"use client";

import { SyncSettingsModal } from "@/components/sync-settings-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc/client";
import { CheckCircle2, ExternalLink, Loader2, Settings, XCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function IntegrationsTab() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncFailed, setIsSyncFailed] = useState(false);
  const [syncFailureReason, setSyncFailureReason] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ processed: number; total: number; percentage: number } | null>(null);
  const [syncPhase, setSyncPhase] = useState<string | null>(null);

  const checkDocketwiseConnection = async () => {
    try {
      setIsLoading(true);
      const result = await client.docketwise.getStatus({});
      setIsConnected(result.connected);
    } catch (error) {
      console.error("Error checking Docketwise connection:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await client.sync.getStatus({});
      setIsSyncing(status.isRunning);
      setIsSyncFailed(status.isFailed || false);
      setSyncFailureReason(status.failureReason || null);
      setSyncProgress(status.progress);
      setSyncPhase(status.phaseName);
    } catch (error) {
      console.error("Error checking sync status:", error);
      setIsSyncing(false);
      setIsSyncFailed(false);
      setSyncFailureReason(null);
      setSyncProgress(null);
      setSyncPhase(null);
    }
  };

  const checkAndTriggerAutoSync = async () => {
    try {
      // Don't auto-sync if already syncing
      if (isSyncing) return;
      
      // Get sync settings to check polling interval
      const settings = await client.sync.getSettings({});
      
      // If no last sync, don't auto-trigger (user should manually sync first)
      if (!settings.lastSyncAt) return;
      
      const lastSyncTime = new Date(settings.lastSyncAt).getTime();
      const currentTime = Date.now();
      const pollingIntervalMs = settings.pollingInterval * 60 * 1000; // Convert minutes to ms
      const timeSinceLastSync = currentTime - lastSyncTime;
      
      // If polling interval has passed, trigger sync
      if (timeSinceLastSync >= pollingIntervalMs) {
        console.log("[AUTO-SYNC] Polling interval passed, triggering automatic sync");
        
        // Trigger sync without blocking UI
        client.sync.unified({}).then(() => {
          console.log("[AUTO-SYNC] Automatic sync completed");
        }).catch((err) => {
          console.error("[AUTO-SYNC] Automatic sync failed:", err);
        });
      }
    } catch (error) {
      console.error("Error checking auto-sync:", error);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await authClient.oauth2.link({
        providerId: "docketwise",
        callbackURL: "/dashboard/settings",
        errorCallbackURL: "/dashboard/settings?error=docketwise_connection_failed",
      });
    } catch (error) {
      console.error("Error connecting to Docketwise:", error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    // TODO: Implement disconnect functionality
    console.log("Disconnect Docketwise");
  };

  useEffect(() => {
    checkDocketwiseConnection();
    checkSyncStatus();
    checkAndTriggerAutoSync();
    
    // Poll sync status every 5 seconds while syncing
    const statusInterval = setInterval(() => {
      checkSyncStatus();
    }, 5000);
    
    // Check for auto-sync every 5 minutes
    const autoSyncInterval = setInterval(() => {
      checkAndTriggerAutoSync();
    }, 300000); // 5 minutes
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(autoSyncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-background">
            <Image
              src="/docketwise.png"
              alt="Docketwise"
              width={32}
              height={32}
            />
          </div>
          <div className="flex-1">
            <CardTitle>Docketwise</CardTitle>
            <CardDescription>
              Connect your Docketwise account to sync matters, clients, and case
              data
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isConnected ? (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <XCircle className="h-5 w-5" />
                Not Connected
              </div>
            )}
            {isConnected && isSyncing && (
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="hidden sm:inline">
                  {syncPhase ? `Syncing (${syncPhase})` : syncProgress && syncProgress.percentage > 0 ? `Syncing (${syncProgress.percentage}%)` : 'Syncing...'}
                </span>
              </div>
            )}
            {isConnected && isSyncFailed && (
              <div className="flex items-center gap-2 text-sm font-medium text-red-600" title={syncFailureReason || 'Sync failed'}>
                <XCircle className="h-5 w-5" />
                <span className="hidden sm:inline">
                  {syncPhase ? `Syncing (${syncPhase}) - Failed` : 'Syncing (Failed)'}
                </span>
                {syncFailureReason && (
                  <span className="hidden lg:inline text-xs text-red-500">({syncFailureReason})</span>
                )}
              </div>
            )}
            {isConnected && (
              <Button
                variant="secondary"
                size="icon-lg"
                onClick={() => setShowSyncSettings(true)}
              >
                <Settings />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Sync matters and case data
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Access client information
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                View USCIS receipts and notes
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Real-time data synchronization
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Disconnect
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://app.docketwise.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Docketwise
                    <ExternalLink />
                  </a>
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                isLoading={isLoading || isConnecting}
                className="w-full sm:w-auto"
              >
                <Image
                  src="/docketwise.png"
                  alt="Docketwise"
                  width={24}
                  height={24}
                />
                Connect Docketwise
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <SyncSettingsModal
        open={showSyncSettings}
        onOpenChange={setShowSyncSettings}
      />
    </div>
  );
}
