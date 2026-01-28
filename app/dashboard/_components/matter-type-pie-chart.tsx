"use client";

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface TypeData {
  type: string;
  count: number;
}

interface MatterTypePieChartProps {
  typeData: TypeData[];
}

// Use consistent colors from the status chart
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function MatterTypePieChart({ typeData }: MatterTypePieChartProps) {
  if (!typeData || typeData.length === 0) {
    return (
      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Matter Type Distribution</h3>
        <p className="text-muted-foreground text-sm dark:text-gray-400">No matter type data available.</p>
      </Card>
    );
  }

  // Take top 6 matter types for better pie chart visibility
  const topTypes = typeData
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(item => ({
      name: item.type,
      value: item.count
    }));

  return (
    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Matter Type Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={topTypes}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {topTypes.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number | undefined) => [`${value || 0} matters`, 'Count']}
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))"
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value: string) => <span className="text-sm dark:text-gray-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
