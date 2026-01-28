"use client";

import { Card } from "@/components/ui/card";
import {
    CheckCircle2,
    AlertTriangle,
    Activity,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export interface HeroKPIStats {
    // Weighted Active Matters
    weightedActiveMatters: number;
    weightedActiveMattersTrend?: number;

    // Revenue at Risk
    revenueAtRisk: number;
    revenueAtRiskTrend?: number;

    // Deadline Compliance Rate
    deadlineComplianceRate: number;

    // Average Cycle Time
    avgCycleTime: number;

    // Paralegal Utilization
    paralegalUtilization: number;
}

interface HeroKPIsProps {
    stats: HeroKPIStats;
}

// Generate subtle chart data for visual appeal
const generateChartData = (baseValue: number, trend: number = 0) => {
    const data = [];
    const direction = trend >= 0 ? 1 : -1;

    for (let i = 0; i < 7; i++) {
        const variation = (i / 6) * (Math.abs(trend) / 100) * direction;
        data.push({
            value: Math.max(0, baseValue * (1 + variation)),
        });
    }
    return data;
};

const MiniChart = ({ data, color }: { data: { value: number }[], color: string }) => {
    return (
        <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const TrendIndicator = ({ trend }: { trend?: number }) => {
    if (trend === undefined || trend === 0) {
        return (
            <span className="text-xs text-muted-foreground font-medium">
                No change
            </span>
        );
    }

    const isPositive = trend > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const sign = isPositive ? '+' : '';
    const colorClass = isPositive ? 'text-emerald-500' : 'text-red-500';

    return (
        <div className={`flex items-center gap-1 ${colorClass}`}>
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">
                {sign}{trend.toFixed(1)}%
            </span>
        </div>
    );
};

export function HeroKPIs({ stats }: HeroKPIsProps) {
    const kpis = [
        {
            label: "Active Matters (Weighted)",
            value: stats.weightedActiveMatters,
            trend: stats.weightedActiveMattersTrend,
            icon: Activity,
            color: "#3b82f6",
            description: "Weighted by complexity",
        },
        {
            label: "Revenue at Risk",
            value: `$${(stats.revenueAtRisk / 1000).toFixed(1)}k`,
            trend: stats.revenueAtRiskTrend,
            icon: AlertTriangle,
            color: stats.revenueAtRisk > 0 ? "#f59e0b" : "#10b981",
            description: "Due in next 14 days",
            isAlert: stats.revenueAtRisk > 0,
        },
        {
            label: "Deadline Compliance",
            value: `${stats.deadlineComplianceRate.toFixed(1)}%`,
            trend: undefined,
            icon: CheckCircle2,
            color: stats.deadlineComplianceRate >= 95 ? "#10b981" : "#f59e0b",
            description: "Target: 95%",
            isAlert: stats.deadlineComplianceRate < 95,
        },
        {
            label: "Paralegal Utilization",
            value: `${stats.paralegalUtilization.toFixed(0)}%`,
            trend: undefined,
            icon: Activity,
            color: stats.paralegalUtilization > 90 ? "#f59e0b" : "#10b981",
            description: "Average utilization",
            isAlert: stats.paralegalUtilization > 90,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const chartData = typeof kpi.value === 'number'
                    ? generateChartData(kpi.value, kpi.trend || 0)
                    : [];

                return (
                    <Card
                        key={kpi.label}
                        className={`p-6 ${kpi.isAlert ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {kpi.label}
                                </p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl font-bold">{kpi.value}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {kpi.description}
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${kpi.isAlert ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
                                <Icon className={`h-6 w-6 ${kpi.isAlert ? 'text-amber-600 dark:text-amber-500' : ''}`} />
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <TrendIndicator trend={kpi.trend} />
                            {chartData.length > 0 && (
                                <div className="flex-1 ml-2">
                                    <MiniChart data={chartData} color={kpi.color} />
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
