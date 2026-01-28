"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  AlertTriangle, 
  TrendingUp
} from "lucide-react";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface MatterFunnelAnalysisProps {
  matters: Array<{
    id: string;
    status: string | null;
    statusForFiling: string | null;
    createdAt: Date | null;
    assignedDate: Date | null;
    closedAt: Date | null;
    docketwiseCreatedAt: Date | null;
    matterType: string | null;
    teamId: number | null;
    totalHours: number | null;
    title: string;
    clientName: string | null;
    docketwiseId: number;
    matterTypeId: number | null;
    estimatedDays?: number;
  }>;
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  avgDaysInStage: number;
  bottleneckRisk: 'low' | 'medium' | 'high';
  color: string;
}

export function MatterFunnelAnalysis({ matters }: MatterFunnelAnalysisProps) {
  // Define funnel stages based on available data
  const getFunnelStages = (): FunnelStage[] => {
    const now = new Date();
    
    // Stage 1: Intake (newly created, not assigned)
    const intake = matters.filter(m => 
      m.docketwiseCreatedAt && 
      !m.assignedDate && 
      !m.closedAt
    );
    
    // Stage 2: Assigned (assigned but not completed)
    const assigned = matters.filter(m => 
      m.assignedDate && 
      !m.closedAt
    );
    
    // Stage 3: In Progress (active work)
    const inProgress = matters.filter(m => 
      m.assignedDate && 
      !m.closedAt && 
      m.totalHours && m.totalHours > 0
    );
    
    // Stage 4: Near Completion (high hours, not closed)
    const nearCompletion = matters.filter(m => 
      m.totalHours && 
      m.totalHours > 15 && 
      m.totalHours < 35 && 
      !m.closedAt
    );
    
    // Stage 5: Completed
    const completed = matters.filter(m => m.closedAt);
    
    const total = matters.length || 1;
    
    return [
      {
        name: "Intake",
        count: intake.length,
        percentage: (intake.length / total) * 100,
        avgDaysInStage: intake.length > 0 
          ? intake.reduce((sum, m) => {
              const assigned = m.assignedDate ? new Date(m.assignedDate) : now;
              const created = m.docketwiseCreatedAt ? new Date(m.docketwiseCreatedAt) : now;
              return sum + ((assigned.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / intake.length
          : 0,
        bottleneckRisk: intake.length > total * 0.3 ? 'high' : intake.length > total * 0.2 ? 'medium' : 'low',
        color: '#3b82f6'
      },
      {
        name: "Assigned",
        count: assigned.length,
        percentage: (assigned.length / total) * 100,
        avgDaysInStage: assigned.length > 0 
          ? assigned.reduce((sum, m) => {
              const now = new Date();
              const assigned = m.assignedDate ? new Date(m.assignedDate) : now;
              return sum + ((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / assigned.length
          : 0,
        bottleneckRisk: assigned.length > total * 0.4 ? 'high' : assigned.length > total * 0.3 ? 'medium' : 'low',
        color: '#f59e0b'
      },
      {
        name: "In Progress",
        count: inProgress.length,
        percentage: (inProgress.length / total) * 100,
        avgDaysInStage: inProgress.length > 0 
          ? inProgress.reduce((sum, m) => {
              const now = new Date();
              const assigned = m.assignedDate ? new Date(m.assignedDate) : now;
              return sum + ((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / inProgress.length
          : 0,
        bottleneckRisk: inProgress.length > total * 0.5 ? 'high' : inProgress.length > total * 0.4 ? 'medium' : 'low',
        color: '#8b5cf6'
      },
      {
        name: "Near Completion",
        count: nearCompletion.length,
        percentage: (nearCompletion.length / total) * 100,
        avgDaysInStage: nearCompletion.length > 0 
          ? nearCompletion.reduce((sum, m) => {
              const now = new Date();
              const assigned = m.assignedDate ? new Date(m.assignedDate) : now;
              return sum + ((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / nearCompletion.length
          : 0,
        bottleneckRisk: nearCompletion.length > total * 0.2 ? 'high' : nearCompletion.length > total * 0.1 ? 'medium' : 'low',
        color: '#06b6d4'
      },
      {
        name: "Completed",
        count: completed.length,
        percentage: (completed.length / total) * 100,
        avgDaysInStage: completed.length > 0 
          ? completed.reduce((sum, m) => {
              const created = m.docketwiseCreatedAt ? new Date(m.docketwiseCreatedAt) : new Date();
              const closed = m.closedAt ? new Date(m.closedAt) : now;
              return sum + ((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / completed.length
          : 0,
        bottleneckRisk: 'low',
        color: '#10b981'
      }
    ];
  };

  // Get matter type distribution
  const getMatterTypeDistribution = () => {
    const typeCount = new Map<string, number>();
    
    matters.forEach(matter => {
      if (matter.matterType) {
        typeCount.set(matter.matterType, (typeCount.get(matter.matterType) || 0) + 1);
      }
    });
    
    return Array.from(typeCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 types
  };

  // Get complexity distribution
  const getComplexityDistribution = () => {
    const complexityCount = { simple: 0, medium: 0, complex: 0 };
    
    matters.forEach(matter => {
      // Use matter type complexity if available, otherwise estimate from hours
      if (matter.matterTypeId) {
        // TODO: Use actual complexityWeight from matterTypes when available
        // For now, estimate based on hours
        if (matter.totalHours) {
          if (matter.totalHours < 15) complexityCount.simple++;
          else if (matter.totalHours < 30) complexityCount.medium++;
          else complexityCount.complex++;
        } else {
          complexityCount.simple++; // Default to simple
        }
      } else {
        complexityCount.simple++; // Default to simple
      }
    });
    
    return [
      { name: 'Simple', value: complexityCount.simple, color: '#10b981' },
      { name: 'Medium', value: complexityCount.medium, color: '#f59e0b' },
      { name: 'Complex', value: complexityCount.complex, color: '#ef4444' }
    ];
  };

  const funnelStages = getFunnelStages();
  const matterTypeData = getMatterTypeDistribution();
  const complexityData = getComplexityDistribution();

  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'];

  // Calculate overall bottleneck risk
  const bottleneckStages = funnelStages.filter(s => s.bottleneckRisk === 'high');
  const hasBottlenecks = bottleneckStages.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Matter Lifecycle Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            Track matters through each stage and identify bottlenecks
          </p>
        </div>
        {hasBottlenecks && (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Bottlenecks Detected
          </Badge>
        )}
      </div>

      {/* Funnel Visualization */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Funnel Chart */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">Matter Funnel</h4>
          <div className="space-y-3">
            {funnelStages.map((stage) => (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-medium">{stage.name}</span>
                    {stage.bottleneckRisk === 'high' && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{stage.count}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({stage.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={stage.percentage} 
                  className="h-2"
                  style={{ 
                    backgroundColor: `${stage.color}20`,
                  }}
                />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Avg time: {stage.avgDaysInStage.toFixed(1)} days</span>
                  <span className={
                    stage.bottleneckRisk === 'high' ? 'text-red-600' :
                    stage.bottleneckRisk === 'medium' ? 'text-amber-600' : 'text-green-600'
                  }>
                    {stage.bottleneckRisk === 'high' ? 'High risk' :
                     stage.bottleneckRisk === 'medium' ? 'Medium risk' : 'Low risk'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Matter Type Distribution */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">Top Matter Types</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={matterTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {matterTypeData.map((entry, entryIndex) => (
                    <Cell key={`cell-${entryIndex}`} fill={COLORS[entryIndex % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${(value as number)} matters`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {matterTypeData.map((type, typeIndex) => (
              <div key={type.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[typeIndex % COLORS.length] }}
                  />
                  <span>{type.name}</span>
                </div>
                <span className="font-medium">{type.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Complexity Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">Complexity Distribution</h4>
          <div className="space-y-3">
            {complexityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{item.value}</span>
                  <div className="w-24">
                    <Progress 
                      value={(item.value / matters.length) * 100} 
                      className="h-2"
                      style={{ backgroundColor: `${item.color}20` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bottleneck Analysis */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">Bottleneck Analysis</h4>
          <div className="space-y-4">
            {bottleneckStages.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-400">
                      Critical Bottlenecks
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-red-700 dark:text-red-500">
                    {bottleneckStages.map(stage => (
                      <div key={stage.name}>
                        • {stage.name}: {stage.count} matters ({stage.avgDaysInStage.toFixed(1)} days avg)
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      Recommendations
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-amber-700 dark:text-amber-500">
                    <div>• Reallocate resources from low-risk stages</div>
                    <div>• Prioritize bottlenecks with highest value matters</div>
                    <div>• Consider temporary staffing for critical stages</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-400">
                    Healthy Flow
                  </span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                  No significant bottlenecks detected in the current workflow.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
