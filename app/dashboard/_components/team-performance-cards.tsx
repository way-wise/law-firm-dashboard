"use client";

import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

interface TeamMember {
  name: string;
  activeMatters: number;
  completedCount: number;
  avgDaysToFile?: number;
  onTimeRate?: number;
}

interface TeamPerformanceCardsProps {
  members: TeamMember[];
  title?: string;
}

export function TeamPerformanceCards({ members, title = "In-House Team" }: TeamPerformanceCardsProps) {
  const totalActive = members.reduce((sum, m) => sum + m.activeMatters, 0);

  if (members.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">No team members found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <User className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
          {totalActive} active cases
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.slice(0, 6).map((member, idx) => {
          const total = member.activeMatters + member.completedCount;
          const completionRate = total > 0 ? (member.completedCount / total) * 100 : 0;
          
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.activeMatters} cases</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <User className="size-4" />
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{completionRate.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
