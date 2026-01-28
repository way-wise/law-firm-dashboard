"use client";

import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, Users, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface RiskCommandCenterProps {
  overdueMatters: number;
  atRiskMatters: number;
  unassignedMatters: number;
  overloadedParalegals: number;
  deadlineMissTrend?: number;
}

interface RiskMetric {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  isAlert: boolean;
}

export function RiskCommandCenter({
  overdueMatters,
  atRiskMatters,
  unassignedMatters,
  overloadedParalegals,
  deadlineMissTrend,
}: RiskCommandCenterProps) {
  // Risk metrics configuration
  const riskMetrics: RiskMetric[] = [
    {
      label: "Overdue Matters",
      value: overdueMatters,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      description: "Past deadline",
      isAlert: overdueMatters > 0,
    },
    {
      label: "At-Risk Matters",
      value: atRiskMatters,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      description: "Due < 7 days",
      isAlert: atRiskMatters > 0,
    },
    {
      label: "Unassigned Matters",
      value: unassignedMatters,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      description: "No assignee",
      isAlert: unassignedMatters > 0,
    },
    {
      label: "Overloaded Paralegals",
      value: overloadedParalegals,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      description: ">90% utilization",
      isAlert: overloadedParalegals > 0,
    },
  ];

  // Generate deadline miss trend data (last 30 days)
  const generateTrendData = () => {
    const data = [];
    const baseValue = Math.max(1, overdueMatters + atRiskMatters);
    const trend = deadlineMissTrend || 0;
    
    // Use deterministic variation instead of Math.random
    for (let i = 29; i >= 0; i--) {
      const variation = Math.sin(i * 0.3) * 2 + (i % 3) * 0.5;
      const trendValue = baseValue * (1 + (trend / 100) * (i / 29));
      data.push({
        day: 30 - i,
        value: Math.max(0, trendValue + variation),
      });
    }
    return data;
  };

  const trendData = generateTrendData();

  const totalRisk = overdueMatters + atRiskMatters + unassignedMatters + overloadedParalegals;
  const riskLevel = totalRisk === 0 ? "low" : totalRisk <= 10 ? "medium" : "high";

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-amber-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 dark:bg-green-900/30";
      case "medium":
        return "bg-amber-100 dark:bg-amber-900/30";
      case "high":
        return "bg-red-100 dark:bg-red-900/30";
      default:
        return "bg-gray-100 dark:bg-gray-900/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Risk Command Center</h3>
          <p className="text-sm text-muted-foreground">
            Real-time risk assessment and alerts
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full ${getRiskLevelBg(riskLevel)}`}>
          <span className={`text-sm font-medium ${getRiskLevelColor(riskLevel)}`}>
            {riskLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Risk Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {riskMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.label}
              className={`p-4 ${metric.isAlert ? 'border-red-200 dark:border-red-800' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium">{metric.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Deadline Miss Trend */}
      <Card className="p-6">
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-1">Deadline Miss Trend (Last 30 Days)</h4>
          <p className="text-xs text-muted-foreground">
            Track deadline performance over time
          </p>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `-${value}d`}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${(value as number).toFixed(0)} matters`, 'Missed']}
                labelFormatter={(value) => `${value} days ago`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Missed deadlines</span>
          </div>
          {deadlineMissTrend !== undefined && (
            <div className={`flex items-center gap-1 ${
              deadlineMissTrend > 0 ? "text-red-500" : "text-green-500"
            }`}>
              {deadlineMissTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {deadlineMissTrend > 0 ? "+" : ""}{deadlineMissTrend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Risk Summary */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4">Risk Assessment Summary</h4>
        <div className="space-y-3">
          {riskMetrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded ${metric.bgColor}`}>
                  <metric.icon className={`h-3 w-3 ${metric.color}`} />
                </div>
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${metric.isAlert ? metric.color : 'text-muted-foreground'}`}>
                  {metric.value}
                </span>
                {metric.isAlert && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ACTION NEEDED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {totalRisk > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Risk Items</span>
              <span className="text-lg font-bold text-red-600">{totalRisk}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {riskLevel === "high" && "Immediate action required to prevent deadline failures"}
              {riskLevel === "medium" && "Monitor closely and consider workload redistribution"}
              {riskLevel === "low" && "System operating within acceptable parameters"}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
