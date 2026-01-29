"use client";

import { Card } from "@/components/ui/card";

interface AdjudicationData {
  month: string;
  newMatters: number;
  approved: number;
  rfe: number;
}

interface AdjudicationTrendsProps {
  data: AdjudicationData[];
}

export function AdjudicationTrends({ data }: AdjudicationTrendsProps) {
  // Get max value for scaling
  const maxValue = Math.max(
    ...data.flatMap(d => [d.newMatters, d.approved, d.rfe]),
    1
  );

  return (
    <Card className="p-6 h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-base font-semibold">Adjudication Trends</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-primary" />
              <span className="text-muted-foreground">New Matters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-red-500" />
              <span className="text-muted-foreground">Denied</span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex-1 flex items-end justify-between gap-3 min-h-[180px]">
          {data.map((item, idx) => {
            const newHeight = (item.newMatters / maxValue) * 100;
            const approvedHeight = (item.approved / maxValue) * 100;
            const rfeHeight = (item.rfe / maxValue) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full">
                {/* Bars Container */}
                <div className="flex-1 w-full flex items-end justify-center gap-1 pb-2">
                  {/* New Matters */}
                  <div className="w-5 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] font-medium text-primary mb-1">{item.newMatters}</span>
                    <div
                      className="w-full bg-primary rounded-t"
                      style={{ height: `${Math.max(newHeight, 4)}%` }}
                    />
                  </div>
                  
                  {/* Approved */}
                  <div className="w-5 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] font-medium text-emerald-500 mb-1">{item.approved}</span>
                    <div
                      className="w-full bg-emerald-500 rounded-t"
                      style={{ height: `${Math.max(approvedHeight, 4)}%` }}
                    />
                  </div>
                  
                  {/* RFE/Denied */}
                  <div className="w-5 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] font-medium text-red-500 mb-1">{item.rfe}</span>
                    <div
                      className="w-full bg-red-500 rounded-t"
                      style={{ height: `${Math.max(rfeHeight, 4)}%` }}
                    />
                  </div>
                </div>
                
                {/* Month Label */}
                <span className="text-xs text-muted-foreground mt-1">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
