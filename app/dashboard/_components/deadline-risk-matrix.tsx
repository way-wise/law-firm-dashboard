"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DeadlineRiskMatrixProps {
  matters: Array<{
    id: string;
    estimatedDeadline: Date | null;
    actualDeadline: Date | null;
    teamId: number | null;
    totalHours: number | null;
    title: string;
    status: string | null;
    assignees: string | null;
    docketwiseId: number;
    clientName: string | null;
    matterType: string | null;
    matterTypeId: number | null;
    statusForFiling: string | null;
    createdAt: Date | null;
    assignedDate: Date | null;
    closedAt: Date | null;
    docketwiseCreatedAt: Date | null;
    estimatedDays?: number;
  }>;
  paralegals: Array<{
    id: number;
    name: string;
    email: string;
    matterCount: number;
    completedCount: number;
    overdueCount: number;
    onTimeRate: number;
    avgDaysOpen: number;
  }>;
}

interface RiskDataPoint {
  x: number; // Days until deadline
  y: number; // Paralegal workload percentage
  matterId: string;
  title: string;
  assignee: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

// Move CustomTooltip outside component to avoid recreation during render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as any;
    return (
      <div className="p-3 bg-background border rounded-lg shadow-lg">
        <p className="font-medium">{data.title}</p>
        <p className="text-sm text-muted-foreground">Assignee: {data.assignee}</p>
        <p className="text-sm text-muted-foreground">Days until deadline: {data.x}</p>
        <p className="text-sm text-muted-foreground">Workload: {data.y.toFixed(1)}%</p>
        <p className="text-sm font-medium">
          Risk: <span className={`ml-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}>
            {data.riskLevel.toUpperCase()}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function DeadlineRiskMatrix({ matters, paralegals }: DeadlineRiskMatrixProps) {
  // Create paralegal lookup map
  const paralegalMap = new Map(
    paralegals.map(p => [p.id, {
      fullName: p.name,
      availableHoursPerWeek: 0, // No default - should be null if not set
      utilizationTarget: 0, // No default - should be null if not set
    }])
  );

  // Calculate risk data points
  const calculateRiskData = (): RiskDataPoint[] => {
    const now = new Date();
    const riskData: RiskDataPoint[] = [];

    matters.forEach(matter => {
      if (!matter.estimatedDeadline || !matter.teamId) return;

      const daysUntilDeadline = Math.ceil(
        (new Date(matter.estimatedDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Skip matters already past deadline (they're in the overdue section)
      if (daysUntilDeadline < 0) return;

      // Calculate paralegal workload
      const paralegal = paralegalMap.get(matter.teamId);
      if (!paralegal) return;

      // Get all matters assigned to this paralegal
      const paralegalMatters = matters.filter(m => m.teamId === matter.teamId);
      const totalAssignedHours = paralegalMatters.reduce((sum, m) => sum + (m.totalHours || 0), 0);
      const availableHours = (paralegal.availableHoursPerWeek || 40) * 4; // Monthly
      const workloadPercentage = availableHours > 0 ? (totalAssignedHours / availableHours) * 100 : 0;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (daysUntilDeadline <= 3 && workloadPercentage > 90) {
        riskLevel = 'critical';
      } else if (daysUntilDeadline <= 7 && workloadPercentage > 85) {
        riskLevel = 'high';
      } else if (daysUntilDeadline <= 14 && workloadPercentage > 80) {
        riskLevel = 'medium';
      } else if (daysUntilDeadline <= 21 && workloadPercentage > 70) {
        riskLevel = 'low';
      }

      riskData.push({
        x: daysUntilDeadline,
        y: workloadPercentage,
        matterId: matter.id,
        title: matter.title,
        assignee: paralegal.fullName,
        riskLevel,
        status: matter.status || 'Unknown',
      });
    });

    return riskData;
  };

  const riskData = calculateRiskData();

  // Calculate risk distribution
  const riskDistribution = {
    critical: riskData.filter(d => d.riskLevel === 'critical').length,
    high: riskData.filter(d => d.riskLevel === 'high').length,
    medium: riskData.filter(d => d.riskLevel === 'medium').length,
    low: riskData.filter(d => d.riskLevel === 'low').length,
  };

  // Get high-risk matters (for detailed list)
  const highRiskMatters = riskData
    .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
    .sort((a, b) => a.x - b.x) // Sort by deadline urgency
    .slice(0, 10);

  // Calculate overall risk score
  const totalMatters = riskData.length;
  const riskScore = totalMatters > 0 
    ? ((riskDistribution.critical * 4 + riskDistribution.high * 3 + riskDistribution.medium * 2 + riskDistribution.low * 1) / totalMatters)
    : 0;

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deadline Risk Matrix</h3>
          <p className="text-sm text-muted-foreground">
            Predictive analysis of deadline risks based on timing and workload
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {riskScore.toFixed(1)}
            <span className="text-sm text-muted-foreground ml-1">/4.0</span>
          </div>
          <p className="text-xs text-muted-foreground">Risk Score</p>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={`p-4 ${riskDistribution.critical > 0 ? 'border-red-200 dark:border-red-800' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Critical Risk</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{riskDistribution.critical}</span>
          </div>
          <p className="text-xs text-muted-foreground">Immediate action required</p>
        </Card>

        <Card className={`p-4 ${riskDistribution.high > 0 ? 'border-amber-200 dark:border-amber-800' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">High Risk</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{riskDistribution.high}</span>
          </div>
          <p className="text-xs text-muted-foreground">Monitor closely</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Medium Risk</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{riskDistribution.medium}</span>
          </div>
          <p className="text-xs text-muted-foreground">Plan ahead</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Low Risk</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{riskDistribution.low}</span>
          </div>
          <p className="text-xs text-muted-foreground">On track</p>
        </Card>
      </div>

      {/* Risk Matrix Chart */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4">Risk Matrix (Days Until Deadline vs Workload)</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                dataKey="x"
                name="Days Until Deadline"
                domain={[0, 'dataMax']}
                tick={{ fontSize: 10 }}
                label={{ value: 'Days Until Deadline', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number"
                dataKey="y"
                name="Workload %"
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                label={{ value: 'Workload %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={riskData} fill="#8884d">
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskLevelColor(entry.riskLevel)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Critical (&le; 3 days, &gt; 90% workload)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span>High (&le; 7 days, &gt; 85% workload)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Medium (&le; 14 days, &gt; 80% workload)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Low (&le; 21 days, &gt; 70% workload)</span>
            </div>
          </div>
          
          {riskScore > 2.5 && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              High Risk Environment
            </Badge>
          )}
        </div>
      </Card>

      {/* High Risk Matters List */}
      {highRiskMatters.length > 0 && (
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">High Priority Matters</h4>
          <div className="space-y-3">
            {highRiskMatters.map((matter) => (
              <div key={matter.matterId} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{matter.title}</span>
                    <Badge className={getRiskLevelBg(matter.riskLevel)}>
                      {matter.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Assignee: {matter.assignee}</span>
                    <span>Deadline: {matter.x} days</span>
                    <span>Workload: {matter.y.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    Action Required
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4">Predictive Recommendations</h4>
        <div className="space-y-3">
          {riskDistribution.critical > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800 dark:text-red-400">
                  Immediate Action Required
                </span>
              </div>
              <div className="text-xs text-red-700 dark:text-red-500 space-y-1">
                <div>• Reassign {riskDistribution.critical} critical matters to available paralegals</div>
                <div>• Extend deadlines or request additional resources</div>
                <div>• Prioritize matters with highest client impact</div>
              </div>
            </div>
          )}
          
          {riskDistribution.high > 0 && riskDistribution.critical === 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Monitor Workload Closely
                </span>
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
                <div>• Review {riskDistribution.high} high-risk matters daily</div>
                <div>• Consider temporary assistance for overloaded paralegals</div>
                <div>• Schedule buffer time for unexpected delays</div>
              </div>
            </div>
          )}
          
          {riskDistribution.medium > 0 && riskDistribution.high === 0 && riskDistribution.critical === 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
                  Plan Capacity Ahead
                </span>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-500 space-y-1">
                <div>• Forecast workload for next 2-3 weeks</div>
                <div>• Schedule training for efficiency improvements</div>
                <div>• Optimize matter assignment strategy</div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
