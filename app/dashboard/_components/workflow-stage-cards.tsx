"use client";

import { Card } from "@/components/ui/card";
import { FileEdit, Send, AlertCircle, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCategory {
  category: string;
  count: number;
  statuses: Array<{
    statusId: number;
    statusName: string;
    matterCount: number;
  }>;
}

interface WorkflowStageCardsProps {
  distribution: {
    byStatus: Array<{ status: string; count: number }>;
  };
  statusByCategory?: StatusCategory[];
}

// Map category names to display config
const categoryConfig: Record<string, { 
  label: string; 
  icon: typeof FileEdit;
  iconBg: string;
  progressColor: string;
}> = {
  pending: { 
    label: "Pending/Drafting", 
    icon: FileEdit,
    iconBg: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    progressColor: "bg-amber-500",
  },
  rfe: { 
    label: "RFE", 
    icon: AlertCircle,
    iconBg: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
    progressColor: "bg-red-500",
  },
  filed: { 
    label: "Filed", 
    icon: Send,
    iconBg: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    progressColor: "bg-blue-500",
  },
  interview: { 
    label: "Interview", 
    icon: Calendar,
    iconBg: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
    progressColor: "bg-purple-500",
  },
  approved: { 
    label: "Approved", 
    icon: CheckCircle,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    progressColor: "bg-emerald-500",
  },
  denied: { 
    label: "Denied", 
    icon: XCircle,
    iconBg: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
    progressColor: "bg-red-500",
  },
  closed: { 
    label: "Closed", 
    icon: CheckCircle,
    iconBg: "bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400",
    progressColor: "bg-slate-500",
  },
  other: { 
    label: "Other", 
    icon: Clock,
    iconBg: "bg-primary/10 text-primary",
    progressColor: "bg-primary",
  },
};

// Priority order for displaying categories
const categoryPriority = ['pending', 'filed', 'rfe', 'interview', 'approved', 'denied', 'closed', 'other'];

export function WorkflowStageCards({ distribution, statusByCategory }: WorkflowStageCardsProps) {
  // Use statusByCategory if available (real data from matterStatuses table)
  // Otherwise fall back to distribution.byStatus parsing
  let stages: Array<{ key: string; label: string; icon: typeof FileEdit; iconBg: string; progressColor: string; count: number }>;
  
  if (statusByCategory && statusByCategory.length > 0) {
    // Use real categorized data from API
    stages = categoryPriority
      .map(category => {
        const data = statusByCategory.find(s => s.category === category);
        const config = categoryConfig[category] || categoryConfig.other;
        return {
          key: category,
          ...config,
          count: data?.count || 0,
        };
      })
      .filter(s => s.count > 0) // Only show categories with matters
      .slice(0, 4); // Show top 4 categories
  } else {
    // Fallback to old string matching logic
    const stageConfig = [
      { key: "pending", match: (s: string) => s.toLowerCase().includes('draft') || s.toLowerCase().includes('pending') },
      { key: "rfe", match: (s: string) => s.toLowerCase().includes('rfe') },
      { key: "filed", match: (s: string) => s.toLowerCase().includes('filed') || s.toLowerCase().includes('submitted') },
      { key: "other", match: () => true },
    ];
    
    stages = stageConfig.map(config => {
      const categoryConf = categoryConfig[config.key] || categoryConfig.other;
      return {
        key: config.key,
        ...categoryConf,
        count: distribution.byStatus
          .filter(s => config.match(s.status))
          .reduce((sum, s) => sum + s.count, 0)
      };
    });
  }

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
