"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Briefcase, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

interface ParalegalStats {
  id: number;
  name: string;
  email: string;
  matterCount: number;
  completedCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDaysOpen: number;
  performanceIndex: number;
  rfeRate: number;
  revisionRate: number;
  utilization: number;
  avgCycleTime: number;
  activeMatters: number;
}

interface ParalegalPerformanceCardsProps {
  paralegals: ParalegalStats[];
}

function getPerformanceColor(score: number): string {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getPerformanceBadge(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 90) return "default";
  if (score >= 80) return "default";
  if (score >= 70) return "outline";
  return "destructive";
}

function getUtilizationColor(utilization: number): string {
  if (utilization < 50) return "bg-gray-500";
  if (utilization < 85) return "bg-emerald-500";
  if (utilization < 95) return "bg-amber-500";
  return "bg-red-500";
}

function getUtilizationStatus(utilization: number): string {
  if (utilization < 50) return "Under-utilized";
  if (utilization < 85) return "Optimal";
  if (utilization < 95) return "High Load";
  return "Overloaded";
}

export function ParalegalPerformanceCards({ paralegals }: ParalegalPerformanceCardsProps) {
  // Sort by performance index descending
  const sortedParalegals = [...(paralegals || [])].sort(
    (a, b) => (b.performanceIndex || 0) - (a.performanceIndex || 0)
  );

  if (!paralegals || paralegals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No team member data available. Sync data to see performance metrics.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Performance</h3>
        <Badge variant="outline">{sortedParalegals.length} Members</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedParalegals.map((paralegal) => {
          const initials = paralegal.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          const performanceScore = paralegal.performanceIndex || 0;
          const utilization = paralegal.utilization || 0;
          const onTimeRate = paralegal.onTimeRate || 0;
          const activeMatters = paralegal.activeMatters || 0;
          const avgCycle = paralegal.avgCycleTime || 0;

          return (
            <Card key={paralegal.id} className="p-5 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback className="text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{paralegal.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {paralegal.email}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={getPerformanceBadge(performanceScore)}
                  className="shrink-0"
                >
                  {performanceScore}/100
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="space-y-3">
                {/* Active Matters */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="size-4" />
                    <span>Active</span>
                  </div>
                  <span className="font-semibold">{activeMatters}</span>
                </div>

                {/* On-Time Rate */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4" />
                    <span>On-time</span>
                  </div>
                  <span className="font-semibold">{onTimeRate}%</span>
                </div>

                {/* Avg Cycle Time */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="size-4" />
                    <span>Avg Days</span>
                  </div>
                  <span className="font-semibold">{avgCycle}d</span>
                </div>

                {/* Utilization Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className={cn("font-semibold", getPerformanceColor(utilization))}>
                      {utilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={Math.min(100, utilization)} 
                      className="h-2"
                    />
                    <div 
                      className={cn("absolute inset-0 h-2 rounded-full transition-all", getUtilizationColor(utilization))}
                      style={{ width: `${Math.min(100, utilization)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getUtilizationStatus(utilization)}
                  </p>
                </div>

                {/* Overdue Warning */}
                {(paralegal.overdueCount || 0) > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                    <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {paralegal.overdueCount} overdue
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
