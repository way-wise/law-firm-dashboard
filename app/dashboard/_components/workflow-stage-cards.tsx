"use client";

import { Card } from "@/components/ui/card";
import { FileEdit, Send, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStageCardsProps {
  distribution: {
    byStatus: Array<{ status: string; count: number }>;
  };
}

const stageConfig = [
  { 
    key: "drafting",
    label: "Drafting", 
    icon: FileEdit,
    iconBg: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    progressColor: "bg-amber-500",
    match: (s: string) => s.toLowerCase().includes('draft')
  },
  { 
    key: "rfe",
    label: "RFEs", 
    icon: AlertCircle,
    iconBg: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
    progressColor: "bg-red-500",
    match: (s: string) => s.toLowerCase().includes('rfe')
  },
  { 
    key: "filed",
    label: "Filed", 
    icon: Send,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    progressColor: "bg-emerald-500",
    match: (s: string) => s.toLowerCase().includes('filed') || s.toLowerCase().includes('submitted')
  },
  { 
    key: "active",
    label: "Active (Unfiled)", 
    icon: Clock,
    iconBg: "bg-primary/10 text-primary",
    progressColor: "bg-primary",
    match: (s: string) => s.toLowerCase().includes('pending') || s.toLowerCase().includes('active') || s.toLowerCase().includes('review')
  },
];

export function WorkflowStageCards({ distribution }: WorkflowStageCardsProps) {
  const stages = stageConfig.map(config => ({
    ...config,
    count: distribution.byStatus
      .filter(s => config.match(s.status))
      .reduce((sum, s) => sum + s.count, 0)
  }));

  // Calculate total for percentage
  const total = stages.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage) => {
        const Icon = stage.icon;
        const percentage = Math.round((stage.count / total) * 100);
        
        return (
          <Card key={stage.key} className="p-4 h-[120px] flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{stage.label}</p>
                <p className="text-2xl font-bold">{stage.count}</p>
              </div>
              <div className={cn("p-2 rounded-lg shrink-0", stage.iconBg)}>
                <Icon className="size-4" />
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-auto">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{percentage}% of total</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", stage.progressColor)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
