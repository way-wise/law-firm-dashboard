"use client";

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface StatusData {
  status: string;
  count: number;
  [key: string]: string | number;
}

interface MatterStatusPieChartProps {
  statusData: StatusData[];
}

// Use consistent colors from the bar chart
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function MatterStatusPieChart({ statusData }: MatterStatusPieChartProps) {
  if (!statusData || statusData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Status Distribution (Pie)</h3>
        <p className="text-muted-foreground text-sm">No status data available.</p>
      </Card>
    );
  }

  // Convert data for pie chart
  const pieData = statusData.map(item => ({
    name: item.status,
    value: item.count
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Status Distribution (Pie)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number | undefined) => [`${value || 0} matters`, 'Count']}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
