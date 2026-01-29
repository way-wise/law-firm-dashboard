"use client";

import { Card } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface DistributionData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface MatterDistributionChartsProps {
  byType: Array<{ type: string; count: number }>;
  byComplexity: Array<{ level: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

const TYPE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const COMPLEXITY_COLORS = {
  Simple: "hsl(142 76% 36%)",
  Medium: "hsl(38 92% 50%)",
  Complex: "hsl(0 84% 60%)",
};

const STATUS_COLORS = {
  Active: "hsl(221 83% 53%)",
  Filed: "hsl(142 76% 36%)",
  Pending: "hsl(38 92% 50%)",
  Closed: "hsl(215 16% 47%)",
  Other: "hsl(215 20% 65%)",
};

function DonutChart({ data, title }: { data: DistributionData[]; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-center">{title}</h4>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </div>
            <span className="font-semibold shrink-0">
              {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatterDistributionCharts({
  byType,
  byComplexity,
  byStatus,
}: MatterDistributionChartsProps) {
  // Transform data with safe fallbacks
  const typeData: DistributionData[] = (byType || [])
    .filter((item) => item.count > 0)
    .map((item, index) => ({
      name: item.type || "Unknown",
      value: item.count || 0,
      color: TYPE_COLORS[index % TYPE_COLORS.length],
    }))
    .slice(0, 5); // Top 5 types

  const complexityData: DistributionData[] = (byComplexity || [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.level || "Unknown",
      value: item.count || 0,
      color: COMPLEXITY_COLORS[item.level as keyof typeof COMPLEXITY_COLORS] || "hsl(215 20% 65%)",
    }));

  const statusData: DistributionData[] = (byStatus || [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.status || "Unknown",
      value: item.count || 0,
      color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.Other,
    }))
    .slice(0, 5); // Top 5 statuses

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Matter Distribution</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <DonutChart data={typeData} title="By Type" />
        </Card>
        <Card className="p-5">
          <DonutChart data={complexityData} title="By Complexity" />
        </Card>
        <Card className="p-5">
          <DonutChart data={statusData} title="By Status" />
        </Card>
      </div>
    </div>
  );
}
