"use client";

import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TypeData {
  type: string;
  count: number;
}

interface MatterTypeChartProps {
  typeData: TypeData[];
}

export function MatterTypeChart({ typeData }: MatterTypeChartProps) {
  if (!typeData || typeData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Matter Types</h3>
        <p className="text-muted-foreground text-sm">No matter type data available.</p>
      </Card>
    );
  }

  // Take top 10 matter types by count
  const topTypes = typeData
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top 10 Matter Types</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topTypes} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" className="text-xs" />
          <YAxis 
            dataKey="type" 
            type="category" 
            width={150}
            className="text-xs"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
          />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
