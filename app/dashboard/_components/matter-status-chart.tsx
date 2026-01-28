"use client";

import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface StatusData {
  status: string;
  count: number;
  [key: string]: string | number;
}

interface MatterStatusChartProps {
  statusData: StatusData[];
}


export function MatterStatusChart({ statusData }: MatterStatusChartProps) {
  if (!statusData || statusData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Matter Status Distribution</h3>
        <p className="text-muted-foreground text-sm">No status data available. Sync matters to see distribution.</p>
      </Card>
    );
  }

  const totalMatters = statusData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Status Distribution (Bar)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={statusData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="status" 
            angle={-45}
            textAnchor="end"
            height={100}
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">Total Matters: <span className="font-semibold">{totalMatters}</span></p>
      </div>
    </Card>
  );
}
