"use client";

import { Card } from "@/components/ui/card";

interface TeamMemberThroughput {
  name: string;
  assigned: number;
  completed: number;
}

interface TeamThroughputProps {
  data: TeamMemberThroughput[];
}

export function TeamThroughput({ data }: TeamThroughputProps) {
  // Get max for scaling
  const maxTotal = Math.max(...data.map(d => d.assigned + d.completed), 1);

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">Paralegal Throughput</h3>
        <p className="text-sm text-muted-foreground">No team data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Paralegal Throughput</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Assigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Completed</span>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="flex-1 flex flex-col justify-between gap-3">
          {data.map((member, idx) => {
            const total = member.assigned + member.completed;
            const assignedWidth = maxTotal > 0 ? (member.assigned / maxTotal) * 100 : 0;
            const completedWidth = maxTotal > 0 ? (member.completed / maxTotal) * 100 : 0;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{total} total</span>
                </div>
                
                {/* Stacked Horizontal Bar */}
                <div className="flex items-center h-6 bg-muted/30 rounded overflow-hidden">
                  {/* Assigned */}
                  {member.assigned > 0 && (
                    <div
                      className="bg-primary h-full flex items-center justify-center text-primary-foreground text-xs font-medium transition-all"
                      style={{ width: `${assignedWidth}%`, minWidth: '32px' }}
                    >
                      {member.assigned}
                    </div>
                  )}
                  
                  {/* Completed */}
                  {member.completed > 0 && (
                    <div
                      className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-medium transition-all"
                      style={{ width: `${completedWidth}%`, minWidth: '32px' }}
                    >
                      {member.completed}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
