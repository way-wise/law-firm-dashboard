"use client";

import { Card } from "@/components/ui/card";

interface DistributionData {
  label: string;
  count: number;
  color: string;
}

interface MatterDistributionChartProps {
  data: DistributionData[];
}

export function MatterDistributionChart({ data }: MatterDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card className="p-6 h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold mb-6">Matter Distribution</h3>

      {/* Horizontal Bar Chart */}
      <div className="flex-1 space-y-4">
        {data.map((item, idx) => {
          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{percentage}%</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              </div>
              
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all flex items-center justify-end pr-3 text-white text-xs font-medium"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: item.color,
                    minWidth: item.count > 0 ? '60px' : '0'
                  }}
                >
                  {item.count > 0 && item.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
