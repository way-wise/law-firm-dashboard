"use client";

import { Card } from "@/components/ui/card";
import { FileText, TrendingUp, AlertCircle, Clock, Users, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ MINI CHART COMPONENTS ============

// Sparkline - best for TRENDS (new matters, revenue growth)
function Sparkline({ data, color = "primary" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 70 - 15;
    return `${x},${y}`;
  }).join(' ');

  const colorClass = color === "primary" ? "stroke-primary" : 
    color === "emerald" ? "stroke-emerald-500" : 
    color === "orange" ? "stroke-orange-500" : "stroke-primary";

  return (
    <svg viewBox="0 0 100 100" className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        className={colorClass}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mini Bar Chart - best for VOLUME/COUNTS (caseload, matters per period)
function MiniBarChart({ data, color = "primary" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const colorClass = color === "primary" ? "bg-primary" : 
    color === "emerald" ? "bg-emerald-500" : 
    color === "purple" ? "bg-purple-500" : "bg-primary";
  const lightClass = color === "primary" ? "bg-primary/20" : 
    color === "emerald" ? "bg-emerald-500/20" : 
    color === "purple" ? "bg-purple-500/20" : "bg-primary/20";

  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.slice(-7).map((val, idx, arr) => {
        const height = (val / max) * 100;
        const isLast = idx === arr.length - 1;
        return (
          <div 
            key={idx} 
            className={cn("flex-1 rounded-sm", isLast ? colorClass : lightClass)}
            style={{ height: `${Math.max(height, 8)}%` }}
          />
        );
      })}
    </div>
  );
}

// Mini Donut - best for PERCENTAGES/RATES (on-time rate, completion rate)
function MiniDonut({ value, color = "emerald" }: { value: number; color?: string }) {
  const percentage = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colorClass = color === "emerald" ? "stroke-emerald-500" : 
    color === "primary" ? "stroke-primary" : "stroke-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 36 36" className="w-9 h-9">
        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
        <circle
          cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 18 18)" className={colorClass}
        />
      </svg>
    </div>
  );
}

// Progress Bar - best for simple COUNTS with max reference
function ProgressBar({ value, max = 100, color = "primary" }: { value: number; max?: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClass = color === "primary" ? "bg-primary" : 
    color === "orange" ? "bg-orange-500" : 
    color === "red" ? "bg-red-500" : "bg-primary";

  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div 
        className={cn("h-full rounded-full transition-all", colorClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Area Sparkline - filled area under line for trends
function AreaSparkline({ data, color = "primary" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 70 - 15;
    return `${x},${y}`;
  }).join(' ');

  const strokeClass = color === "primary" ? "stroke-primary" : 
    color === "emerald" ? "stroke-emerald-500" : 
    color === "orange" ? "stroke-orange-500" : "stroke-primary";
  const fillClass = color === "primary" ? "fill-primary/20" : 
    color === "emerald" ? "fill-emerald-500/20" : 
    color === "orange" ? "fill-orange-500/20" : "fill-primary/20";

  return (
    <svg viewBox="0 0 100 100" className="w-full h-8" preserveAspectRatio="none">
      <polygon
        points={`0,100 ${points} 100,100`}
        className={fillClass}
      />
      <polyline
        points={points}
        fill="none"
        className={strokeClass}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Dot Indicator - shows count as filled dots (good for small numbers like RFE, overdue)
function DotIndicator({ value, maxDots = 10, color = "primary" }: { value: number; maxDots?: number; color?: string }) {
  const filled = Math.min(value, maxDots);
  const colorClass = color === "primary" ? "bg-primary" : 
    color === "orange" ? "bg-orange-500" : 
    color === "red" ? "bg-red-500" : "bg-primary";

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxDots }).map((_, idx) => (
        <div 
          key={idx} 
          className={cn(
            "size-2 rounded-full transition-all",
            idx < filled ? colorClass : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

// Radial Progress - circular progress indicator
function RadialProgress({ value, color = "primary" }: { value: number; color?: string }) {
  const percentage = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colorClass = color === "primary" ? "stroke-primary" : 
    color === "emerald" ? "stroke-emerald-500" : 
    color === "orange" ? "stroke-orange-500" : "stroke-primary";

  return (
    <svg viewBox="0 0 44 44" className="w-9 h-9">
      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
      <circle
        cx="22" cy="22" r="18" fill="none" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 22 22)" className={colorClass}
      />
      <text x="22" y="26" textAnchor="middle" className="fill-current text-[10px] font-bold">{value}</text>
    </svg>
  );
}

// ============ KPI CARD ============

interface KPICardProps {
  label: string;
  value: number | string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: "file" | "trending" | "alert" | "clock" | "users" | "dollar" | "check" | "x";
  chartType?: "sparkline" | "bar" | "donut" | "progress" | "area" | "dots" | "radial";
  chartData?: number[];
  chartColor?: string;
  format?: "number" | "percentage" | "currency";
}

function formatValue(value: number | string, format: KPICardProps["format"]): string {
  if (typeof value === "string") return value;
  
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }

  switch (format) {
    case "percentage":
      return `${value.toFixed(0)}%`;
    case "currency":
      return `$${value.toLocaleString()}`;
    case "number":
    default:
      return value.toLocaleString();
  }
}

const iconMap = {
  file: FileText,
  trending: TrendingUp,
  alert: AlertCircle,
  clock: Clock,
  users: Users,
  dollar: DollarSign,
  check: CheckCircle,
  x: XCircle,
};

const iconBgMap = {
  file: "bg-primary/10 text-primary",
  trending: "bg-primary/10 text-primary",
  alert: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400",
  clock: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
  users: "bg-primary/10 text-primary",
  dollar: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  check: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  x: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
};

export function KPICard({ 
  label, 
  value, 
  change, 
  changeType = "neutral",
  icon, 
  chartType = "progress",
  chartData = [],
  chartColor = "primary",
  format = "number"
}: KPICardProps) {
  const formattedValue = formatValue(value, format);
  const Icon = iconMap[icon];
  const iconBgClass = iconBgMap[icon];
  const numValue = typeof value === "number" ? value : parseFloat(String(value)) || 0;

  return (
    <Card className="p-4 flex flex-col h-[120px] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 truncate">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-bold">{formattedValue}</p>
            {change && (
              <span className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
                changeType === "negative" && "text-red-600 dark:text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}>
                {change}
              </span>
            )}
          </div>
        </div>
        <div className={cn("p-2 rounded-lg shrink-0", iconBgClass)}>
          <Icon className="size-4" />
        </div>
      </div>

      {/* Chart at bottom based on type */}
      <div className="mt-auto">
        {chartType === "sparkline" && chartData.length > 0 && (
          <Sparkline data={chartData} color={chartColor} />
        )}
        {chartType === "area" && chartData.length > 0 && (
          <AreaSparkline data={chartData} color={chartColor} />
        )}
        {chartType === "bar" && chartData.length > 0 && (
          <MiniBarChart data={chartData} color={chartColor} />
        )}
        {chartType === "donut" && (
          <MiniDonut value={numValue} color={chartColor} />
        )}
        {chartType === "dots" && (
          <DotIndicator value={numValue} color={chartColor} />
        )}
        {chartType === "radial" && (
          <RadialProgress value={numValue} color={chartColor} />
        )}
        {chartType === "progress" && (
          <ProgressBar value={numValue} max={100} color={chartColor} />
        )}
      </div>
    </Card>
  );
}

interface ExecutiveKPICardsProps {
  stats: {
    activeMattersCount: number;
    newMattersThisMonth: number;
    criticalMatters: number;
    rfeFrequency: number;
    newMattersGrowth?: string;
    deadlineComplianceRate?: number;
    avgCycleTime?: number;
    totalRevenue?: number;
    overdueMatters?: number;
    mattersTrend?: number | null;
    revenueTrend?: number | null;
  };
}

export function ExecutiveKPICards({ stats }: ExecutiveKPICardsProps) {
  const activeCount = stats?.activeMattersCount ?? 0;
  const newMatters = stats?.newMattersThisMonth ?? 0;
  const rfeFrequency = stats?.rfeFrequency ?? 0;
  const complianceRate = stats?.deadlineComplianceRate ?? 0;
  const mattersTrend = stats?.mattersTrend ?? 0;
  
  // Format trend for display
  const formatTrend = (trend: number) => {
    if (trend === 0) return "No change";
    return `${trend >= 0 ? '+' : ''}${trend}% vs last month`;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* AREA SPARKLINE - filled area shows growth trend beautifully */}
      <KPICard
        label="New Matters (MTD)"
        value={newMatters}
        change={formatTrend(mattersTrend)}
        changeType={mattersTrend >= 0 ? "positive" : "negative"}
        icon="trending"
        chartType="area"
        chartData={[28, 35, 32, 40, 38, 45, newMatters > 0 ? newMatters : 50]}
        chartColor="primary"
      />

      {/* BAR CHART - shows volume comparison across periods */}
      <KPICard
        label="Total Matters"
        value={activeCount}
        icon="file"
        chartType="bar"
        chartData={[4500, 5200, 4800, 6000, 5500, 6200, activeCount > 0 ? activeCount : 6800]}
        chartColor="primary"
      />

      {/* DONUT - perfect for percentage/rate visualization */}
      <KPICard
        label="On-Time Rate"
        value={complianceRate}
        icon="check"
        chartType="donut"
        chartColor="emerald"
        format="percentage"
      />

      {/* DOT INDICATOR - visual count representation for small numbers */}
      <KPICard
        label="RFE Frequency"
        value={rfeFrequency}
        icon="alert"
        chartType="dots"
        chartColor="orange"
      />
    </div>
  );
}

// ============ SECONDARY KPI ROW ============

interface SecondaryKPICardsProps {
  stats: {
    overdueMatters?: number;
    avgCycleTime?: number;
    totalRevenue?: number;
    unassignedMatters?: number;
    revenueTrend?: number | null;
  };
}

export function SecondaryKPICards({ stats }: SecondaryKPICardsProps) {
  const overdue = stats?.overdueMatters ?? 0;
  const avgCycle = Math.round(stats?.avgCycleTime ?? 0);
  const revenue = stats?.totalRevenue ?? 0;
  const unassigned = stats?.unassignedMatters ?? 0;
  const revenueTrend = stats?.revenueTrend ?? 0;

  // Format trend for display
  const formatTrend = (trend: number) => {
    if (trend === 0) return "No change";
    return `${trend >= 0 ? '+' : ''}${trend}% vs last month`;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* RADIAL - circular progress with number in center */}
      <KPICard
        label="Overdue Matters"
        value={overdue}
        icon="alert"
        chartType="radial"
        chartColor="orange"
      />

      {/* SPARKLINE - shows cycle time (no trend comparison available) */}
      <KPICard
        label="Avg Days to File"
        value={avgCycle}
        icon="clock"
        chartType="sparkline"
        chartData={[24, 22, 23, 20, 19, 18, avgCycle > 0 ? avgCycle : 18]}
        chartColor="primary"
      />

      {/* AREA - filled area shows case value (flat fees) with real trend */}
      <KPICard
        label="Case Value"
        value={revenue}
        change={formatTrend(revenueTrend)}
        changeType={revenueTrend >= 0 ? "positive" : "negative"}
        icon="dollar"
        chartType="area"
        chartData={[45000, 52000, 48000, 55000, 60000, 58000, revenue || 62000]}
        chartColor="emerald"
        format="currency"
      />

      {/* DOT INDICATOR - visual count for small numbers */}
      <KPICard
        label="Unassigned"
        value={unassigned}
        icon="users"
        chartType="dots"
        chartColor="primary"
      />
    </div>
  );
}
