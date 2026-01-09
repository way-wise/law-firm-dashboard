"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function IntegrationsTab() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkDocketwiseConnection();
  }, []);

  const checkDocketwiseConnection = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement actual connection check via API
      // For now, just set to false
      setIsConnected(false);
    } catch (error) {
      console.error("Error checking Docketwise connection:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await authClient.oauth2.link({
        providerId: "docketwise",
        callbackURL: "/dashboard/settings",
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
                    <ExternalLink className="ml-2 h-4 w-4" />
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
    </div>
  );
}
