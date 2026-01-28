"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface AssigneeStat {
    id: number;
    name: string;
    email: string;
    matterCount: number;
    completedCount: number;
    overdueCount: number;
    onTimeRate: number;
    avgDaysOpen: number;
}

interface TeamPerformanceProps {
    assigneeStats: AssigneeStat[];
    stats: {
        onTimeRate: number;
        matterVelocity: number;
        completedMatters: number;
    };
}

export function TeamPerformance({ assigneeStats, stats }: TeamPerformanceProps) {
    // Prepare workload data with color coding
    const workloadData = assigneeStats.map((member) => {
        let status: 'healthy' | 'high' | 'overloaded' = 'healthy';

        // Define workload thresholds
        if (member.matterCount > 30) {
            status = 'overloaded';
        } else if (member.matterCount > 20) {
            status = 'high';
        }

        return {
            name: member.name,
            cases: member.matterCount,
            status,
        };
    }).sort((a, b) => b.cases - a.cases); // Sort by workload descending

    const getBarColor = (status: string) => {
        switch (status) {
            case 'overloaded':
                return '#ef4444'; // red
            case 'high':
                return '#f59e0b'; // amber
            default:
                return '#10b981'; // green
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: Paralegal Workload Chart */}
            <Card className="p-5">
                <h4 className="font-semibold mb-4">Paralegal Workload</h4>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={workloadData}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                        >
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                width={75}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                }}
                                formatter={(value, name, props) => {
                                    const status = props.payload.status;
                                    const statusLabel = status === 'overloaded' ? 'Overloaded' : status === 'high' ? 'High Load' : 'Healthy';
                                    return [`${value} cases (${statusLabel})`, 'Active Cases'];
                                }}
                            />
                            <Bar dataKey="cases" radius={[0, 4, 4, 0]}>
                                {workloadData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                        <span className="text-muted-foreground">Healthy (≤20)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                        <span className="text-muted-foreground">High (21-30)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                        <span className="text-muted-foreground">Overloaded ({'>'}30)</span>
                    </div>
                </div>
            </Card>

            {/* Right: Team Stats */}
            <Card className="p-5">
                <h4 className="font-semibold mb-4">Team Performance</h4>

                <div className="space-y-6">
                    {/* On-Time Filing Rate */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <span className="text-sm font-medium">On-Time Filing Rate</span>
                            </div>
                            <span className="text-2xl font-bold">{stats.onTimeRate}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${stats.onTimeRate}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Percentage of matters completed by deadline
                        </p>
                    </div>

                    {/* Average Completion Time */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                <span className="text-sm font-medium">Avg Completion Time</span>
                            </div>
                            <span className="text-2xl font-bold">{stats.matterVelocity} days</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Average time from opening to completion
                        </p>
                    </div>

                    {/* Completed This Month */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                                <span className="text-sm font-medium">Completed This Month</span>
                            </div>
                            <span className="text-2xl font-bold">{stats.completedMatters}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total matters closed in current month
                        </p>
                    </div>

                    {/* Top Performer */}
                    {assigneeStats.length > 0 && (
                        <div className="pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Top Performer</p>
                            {(() => {
                                const topPerformer = [...assigneeStats].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
                                return (
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="text-sm bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                                {getInitials(topPerformer.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{topPerformer.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {topPerformer.onTimeRate}% on-time rate • {topPerformer.completedCount} completed
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
