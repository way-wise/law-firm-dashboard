"use client";

import { Card } from "@/components/ui/card";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

type MatterTrendsChartProps = Record<string, never>;

export function MatterTrendsChart({ }: MatterTrendsChartProps) {
    // Generate 6 months of sample data
    const generateTrendData = () => {
        const data = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const month = startOfMonth(subMonths(now, i));

            // Generate realistic-looking data (deterministic)
            const baseNew = 20 + (i % 10);
            const baseApproved = 15 + (i % 8);
            const baseDenied = 1 + (i % 3);
            const basePending = 10 + (i % 5);

            data.push({
                month: format(month, 'MMM yyyy'),
                new: baseNew,
                approved: baseApproved,
                denied: baseDenied,
                pending: basePending,
            });
        }

        return data;
    };

    const trendData = generateTrendData();

    return (
        <Card className="p-5">
            <div className="mb-4">
                <h4 className="font-semibold">Matter Trends</h4>
                <p className="text-sm text-muted-foreground">
                    6-month overview of matter status distribution
                </p>
            </div>

            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={trendData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDenied" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11 }}
                            tickMargin={10}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickMargin={10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="circle"
                        />
                        <Area
                            type="monotone"
                            dataKey="new"
                            name="New Matters"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorNew)"
                        />
                        <Area
                            type="monotone"
                            dataKey="approved"
                            name="Approved"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorApproved)"
                        />
                        <Area
                            type="monotone"
                            dataKey="pending"
                            name="Pending"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPending)"
                        />
                        <Area
                            type="monotone"
                            dataKey="denied"
                            name="Denied"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorDenied)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
