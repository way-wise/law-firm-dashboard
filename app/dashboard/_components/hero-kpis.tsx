"use client";

import { Card } from "@/components/ui/card";
import {
    FileText,
    CheckCircle2,
    AlertTriangle,
    Activity,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export interface HeroKPIStats {
    // New matters this month
    newMattersCount: number;
    newMattersTrend?: number;

    // Approval rate
    approvalRate: number;
    approvalRateTrend?: number;

    // Matters approaching deadline (within 7 days)
    deadlineAlerts: number;

    // Active cases total
    activeCases: number;
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
            label: "New Matters (MTD)",
            value: stats.newMattersCount,
            trend: stats.newMattersTrend,
            icon: FileText,
            color: "#3b82f6",
            description: "Month to date",
        },
        {
            label: "Approval Rate",
            value: `${stats.approvalRate}%`,
            trend: stats.approvalRateTrend,
            icon: CheckCircle2,
            color: "#10b981",
            description: "Success rate",
        },
        {
            label: "Deadline Alerts",
            value: stats.deadlineAlerts,
            trend: undefined,
            icon: AlertTriangle,
            color: stats.deadlineAlerts > 0 ? "#f59e0b" : "#10b981",
            description: "Due within 7 days",
            isAlert: stats.deadlineAlerts > 0,
        },
        {
            label: "Active Cases",
            value: stats.activeCases,
            trend: undefined,
            icon: Activity,
            color: "#8b5cf6",
            description: "Currently open",
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
