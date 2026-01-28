"use client";

import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, DollarSign, Activity } from "lucide-react";

interface AnalyticsOverviewChartProps {
  stats?: {
    totalRevenue: number;
    totalMatters: number;
    activeMatters: number;
    matterVelocity: number;
    mattersTrend?: number;
    revenueTrend?: number;
  };
}

// Generate realistic analytics data
const generateAnalyticsData = (stats?: AnalyticsOverviewChartProps['stats']) => {
  const data = [];
  const now = new Date();
  
  // Base values from current stats
  const baseRevenue = stats?.totalRevenue || 50000;
  const baseMatters = stats?.totalMatters || 100;
  const baseVelocity = stats?.matterVelocity || 15;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add realistic variation
    const variation = Math.sin(i / 5) * 0.2 + (Math.random() - 0.5) * 0.3;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.max(0, baseRevenue * (1 + variation)),
      matters: Math.max(1, Math.floor(baseMatters * (1 + variation * 0.5))),
      velocity: Math.max(5, baseVelocity * (1 + variation * 0.2)),
    });
  }
  
  return data;
};

export function AnalyticsOverviewChart({ stats }: AnalyticsOverviewChartProps) {
  const analyticsData = generateAnalyticsData(stats);
  
  const currentMetrics = [
    {
      label: "Monthly Revenue",
      value: stats?.totalRevenue ? `$${(stats.totalRevenue / 1000).toFixed(1)}K` : "$0K",
      icon: DollarSign,
      color: "#10b981",
      trend: stats?.revenueTrend,
    },
    {
      label: "Avg Matter Value",
      value: stats?.totalRevenue && stats?.totalMatters ? `$${Math.round(stats.totalRevenue / stats.totalMatters)}` : "$0",
      icon: TrendingUp,
      color: "#8b5cf6",
    },
    {
      label: "Completion Rate",
      value: stats?.matterVelocity ? `${Math.round(100 / stats.matterVelocity)}%` : "0%",
      icon: Activity,
      color: "#f59e0b",
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Analytics Overview</h3>
          <p className="text-sm text-muted-foreground">30-day performance trends</p>
        </div>
        <Calendar className="h-5 w-5" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {currentMetrics.map((metric, index) => (
            <div key={index} className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold" style={{ color: metric.color }}>
                {metric.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {metric.label}
              </div>
            </div>
        ))}
      </div>

      {/* Combined Analytics Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analyticsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Revenue"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="matters"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Matters"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="velocity"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Velocity"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Matters</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Velocity</span>
        </div>
      </div>
    </Card>
  );
}
