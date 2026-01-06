"use client";

import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalCases: number;
  drafting: number;
  rfes: number;
  filed: number;
  activeUnfiled: number;
  monthlyGrowth: number;
  teamMembers: number;
  avgResolutionTime: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

const statsConfig = [
  {
    key: "totalCases" as const,
    label: "Total Cases",
    icon: FileText,
    chartType: "bar" as const,
    chartColor: "#3b82f6",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    key: "activeUnfiled" as const,
    label: "Active Cases",
    icon: Clock,
    chartType: "progress" as const,
    chartColor: "#3b82f6",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    maxValue: 10,
  },
  {
    key: "drafting" as const,
    label: "In Progress",
    icon: Activity,
    chartType: "progress" as const,
    chartColor: "#3b82f6",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    maxValue: 10,
  },
  {
    key: "rfes" as const,
    label: "RFEs Pending",
    icon: AlertTriangle,
    chartType: "indicator" as const,
    chartColor: "#f59e0b",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    key: "filed" as const,
    label: "Cases Filed",
    icon: CheckCircle2,
    chartType: "area" as const,
    chartColor: "#10b981",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    key: "monthlyGrowth" as const,
    label: "Monthly Growth",
    icon: TrendingUp,
    chartType: "area" as const,
    chartColor: "#10b981",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    isPercentage: true,
  },
  {
    key: "teamMembers" as const,
    label: "Team Members",
    icon: Users,
    chartType: "dots" as const,
    chartColor: "#3b82f6",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    key: "avgResolutionTime" as const,
    label: "Avg Resolution",
    icon: Calendar,
    chartType: "gauge" as const,
    chartColor: "#6b7280",
    iconBg: "bg-gray-500/10",
    iconColor: "text-gray-500",
    isDays: true,
    targetValue: 60,
  },
];

function AreaChart({ id, color }: { id: string; color: string }) {
  return (
    <svg viewBox="0 0 72 40" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M0,32 C8,28 16,30 24,26 C32,22 40,24 48,18 C56,12 64,14 72,8 L72,40 L0,40 Z"
        fill={`url(#gradient-${id})`}
      />
      <path
        d="M0,32 C8,28 16,30 24,26 C32,22 40,24 48,18 C56,12 64,14 72,8"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BarChart({ color }: { color: string }) {
  const bars = [40, 65, 45, 80, 55, 70, 60];
  return (
    <div className="flex items-end gap-1 h-full px-1">
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{ 
            height: `${height}%`, 
            backgroundColor: i === bars.length - 1 ? color : `${color}40`
          }}
        />
      ))}
    </div>
  );
}

function DotsChart({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: Math.min(value, 12) }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
      {value > 12 && (
        <span className="text-xs text-muted-foreground">+{value - 12}</span>
      )}
    </div>
  );
}

function IndicatorChart({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full animate-pulse"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs" style={{ color }}>
        {value > 0 ? `${value} requiring attention` : "All clear"}
      </span>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{value} of {max}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function GaugeChart({ value, target, color }: { value: number; target: number; color: string }) {
  const percentage = Math.min((value / target) * 100, 100);
  const isGood = value <= target;
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={isGood ? "#10b981" : color}
            strokeWidth="4"
            strokeDasharray={`${percentage * 0.88} 88`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>Target: {target}d</p>
        <p className={isGood ? "text-emerald-500" : "text-amber-500"}>
          {isGood ? "On track" : "Attention"}
        </p>
      </div>
    </div>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((config, index) => {
        const Icon = config.icon;
        const value = stats[config.key];

        return (
          <Card key={config.key} className="overflow-hidden h-[180px] flex flex-col">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </p>
                <div className={`rounded-lg p-2.5 ${config.iconBg}`}>
                  <Icon className={`size-5 ${config.iconColor}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">
                  {config.isPercentage ? (
                    <>{value}%</>
                  ) : config.isDays ? (
                    <>{value} days</>
                  ) : (
                    value.toLocaleString()
                  )}
                </p>
              </div>
              
              {/* Chart based on type */}
              <div className="mt-auto">
                {config.chartType === "progress" && config.maxValue && (
                  <ProgressBar value={value} max={config.maxValue} color={config.chartColor} />
                )}
                
                {config.chartType === "gauge" && config.targetValue && (
                  <GaugeChart value={value} target={config.targetValue} color={config.chartColor} />
                )}
                
                {config.chartType === "dots" && (
                  <DotsChart value={value} color={config.chartColor} />
                )}
                
                {config.chartType === "indicator" && (
                  <IndicatorChart value={value} color={config.chartColor} />
                )}
                
                {config.chartType === "area" && (
                  <div className="h-12 -mx-5 -mb-5 mt-2">
                    <AreaChart id={`chart-${index}`} color={config.chartColor} />
                  </div>
                )}
                
                {config.chartType === "bar" && (
                  <div className="h-10">
                    <BarChart color={config.chartColor} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
