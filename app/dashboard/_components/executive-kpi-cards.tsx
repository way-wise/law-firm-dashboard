"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  CheckCircle2,
  Clock,
  Users,
  Briefcase,
} from "lucide-react";

interface KPICardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number | null;
  target?: number;
  format?: "number" | "currency" | "percentage" | "days";
  icon?: React.ElementType;
  dataQuality?: number; // 0-100, shows warning if < 85
}

function formatValue(value: number | string, format: KPICardProps["format"], unit?: string): string {
  if (typeof value === "string") return value;
  
  // Handle null, undefined, NaN
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${value.toFixed(1)} ${unit || "days"}`;
    case "number":
    default:
      return value.toLocaleString();
  }
}

function getTrendColor(trend: number | null | undefined, inverseGood = false) {
  if (!trend || trend === 0) return "text-muted-foreground";
  
  const isPositive = trend > 0;
  const isGood = inverseGood ? !isPositive : isPositive;
  
  return isGood ? "text-emerald-500" : "text-red-500";
}

function getStatusColor(value: number, target?: number, format?: KPICardProps["format"]) {
  if (!target) return "text-foreground";
  
  const percentage = format === "percentage" ? value : (value / target) * 100;
  
  if (percentage >= target) return "text-emerald-500";
  if (percentage >= target * 0.9) return "text-amber-500";
  return "text-red-500";
}

export function KPICard({
  label,
  value,
  unit,
  trend,
  target,
  format = "number",
  icon: Icon,
  dataQuality,
}: KPICardProps) {
  const formattedValue = formatValue(value, format, unit);
  const statusColor = target ? getStatusColor(typeof value === "number" ? value : 0, target, format) : "text-foreground";
  const showDataWarning = dataQuality !== undefined && dataQuality < 85;

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="rounded-lg p-2 bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className={cn("text-3xl font-bold", statusColor)}>
          {formattedValue}
        </p>

        <div className="flex items-center gap-3 text-sm">
          {/* Trend Indicator */}
          {trend !== undefined && trend !== null && (
            <div className={cn("flex items-center gap-1", getTrendColor(trend, format === "days"))}>
              {trend > 0 ? (
                <TrendingUp className="size-3" />
              ) : trend < 0 ? (
                <TrendingDown className="size-3" />
              ) : (
                <Minus className="size-3" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}

          {/* Target Indicator */}
          {target && (
            <span className="text-muted-foreground">
              Target: {format === "percentage" ? `${target}%` : target}
            </span>
          )}

          {/* Data Quality Warning */}
          {showDataWarning && (
            <span className="text-xs text-amber-600" title={`Based on ${dataQuality}% of data`}>
              ⓘ {dataQuality}%
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ExecutiveKPICardsProps {
  stats: {
    weightedActiveMatters: number;
    revenueAtRisk: number;
    deadlineComplianceRate: number;
    avgCycleTime: number;
    paralegalUtilization: number;
    mattersTrend?: number | null;
    revenueTrend?: number | null;
    dataQualityScore: number;
    overdueMatters: number;
  };
}

export function ExecutiveKPICards({ stats }: ExecutiveKPICardsProps) {
  // Safely access all values with fallbacks
  const weightedActive = stats?.weightedActiveMatters ?? 0;
  const revenueAtRisk = stats?.revenueAtRisk ?? 0;
  const compliance = stats?.deadlineComplianceRate ?? 0;
  const cycleTime = stats?.avgCycleTime ?? 0;
  const utilization = stats?.paralegalUtilization ?? 0;
  const dataQuality = stats?.dataQualityScore ?? 100;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KPICard
        label="Active Matters"
        value={weightedActive}
        format="number"
        trend={stats?.mattersTrend}
        icon={Briefcase}
      />

      <KPICard
        label="Revenue at Risk"
        value={revenueAtRisk}
        format="currency"
        trend={stats?.revenueTrend}
        icon={DollarSign}
        dataQuality={dataQuality}
      />

      <KPICard
        label="Compliance Rate"
        value={compliance}
        format="percentage"
        target={95}
        icon={CheckCircle2}
      />

      <KPICard
        label="Avg Cycle Time"
        value={cycleTime}
        format="days"
        icon={Clock}
      />

      <KPICard
        label="Team Utilization"
        value={utilization}
        format="percentage"
        target={75}
        icon={Users}
      />
    </div>
  );
}
