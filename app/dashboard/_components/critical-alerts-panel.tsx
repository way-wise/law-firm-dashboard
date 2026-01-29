"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  Clock, 
  UserX, 
  Users,
  TrendingUp,
  Eye,
} from "lucide-react";

interface AlertItem {
  icon: React.ElementType;
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
  href: string;
  trend?: number;
}

interface CriticalAlertsPanelProps {
  stats: {
    overdueMatters: number;
    atRiskMatters: number;
    unassignedMatters: number;
    overloadedParalegals: number;
    deadlineMissTrend?: number | null;
  };
}

export function CriticalAlertsPanel({ stats }: CriticalAlertsPanelProps) {
  // Safe fallbacks for all values
  const overdue = stats?.overdueMatters ?? 0;
  const atRisk = stats?.atRiskMatters ?? 0;
  const unassigned = stats?.unassignedMatters ?? 0;
  const overloaded = stats?.overloadedParalegals ?? 0;

  const alerts: AlertItem[] = [
    {
      icon: AlertTriangle,
      label: "Overdue",
      count: overdue,
      severity: "critical",
      href: "/dashboard/matters?filter=overdue",
    },
    {
      icon: Clock,
      label: "At Risk (<7 days)",
      count: atRisk,
      severity: "warning",
      href: "/dashboard/matters?filter=at-risk",
    },
    {
      icon: UserX,
      label: "Unassigned",
      count: unassigned,
      severity: "info",
      href: "/dashboard/matters?filter=unassigned",
    },
    {
      icon: Users,
      label: "Overloaded Team",
      count: overloaded,
      severity: "warning",
      href: "/dashboard/team",
    },
  ];

  const getSeverityColor = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20";
    }
  };

  const getSeverityBadge = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "outline";
      case "info":
        return "secondary";
    }
  };

  // Check if there are any critical alerts
  const hasCriticalAlerts = overdue > 0 || atRisk > 0 || unassigned > 0 || overloaded > 0;

  if (!hasCriticalAlerts) {
    return (
      <Card className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2 bg-emerald-500/10">
            <Eye className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              All Clear
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              No critical alerts at this time
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          Critical Alerts
        </h3>
        {stats?.deadlineMissTrend !== undefined && stats.deadlineMissTrend !== null && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className={cn(
              "size-4",
              stats.deadlineMissTrend > 0 ? "text-red-500" : "text-emerald-500"
            )} />
            <span>
              {Math.abs(stats.deadlineMissTrend).toFixed(0)}% last 30d
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <Button
              key={alert.label}
              variant="ghost"
              className={cn(
                "w-full h-auto p-4 flex flex-col items-start gap-2 transition-colors",
                getSeverityColor(alert.severity)
              )}
              onClick={() => window.location.href = alert.href}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className="size-5" />
                <Badge variant={getSeverityBadge(alert.severity)}>
                  {alert.count}
                </Badge>
              </div>
              <p className="text-sm font-medium">{alert.label}</p>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
