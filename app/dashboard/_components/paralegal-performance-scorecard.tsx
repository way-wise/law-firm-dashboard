"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Clock, 
  CheckCircle2, 
  Users,
  Target
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ParalegalPerformance {
  id: number;
  name: string;
  email: string;
  matterCount: number;
  completedCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDaysOpen: number;
  performanceIndex?: number;
  utilization?: number;
  qualityScore?: number;
}

interface ParalegalPerformanceScorecardProps {
  paralegals: ParalegalPerformance[];
}

export function ParalegalPerformanceScorecard({ paralegals }: ParalegalPerformanceScorecardProps) {
  // Calculate performance index for each paralegal
  const calculatePerformanceIndex = (paralegal: ParalegalPerformance) => {
    // Formula: (Deadline Compliance × 0.4) + (Avg Speed × 0.3) + (Utilization × 0.2) + (Quality × 0.1)
    const deadlineScore = paralegal.onTimeRate * 0.4;
    const speedScore = Math.max(0, 100 - (paralegal.avgDaysOpen / 30) * 100) * 0.3; // Faster is better
    const utilizationScore = Math.min(100, paralegal.utilization || 0) * 0.2; // Optimal utilization
    const qualityScore = (paralegal.qualityScore || 0) * 0.1;
    
    return deadlineScore + speedScore + utilizationScore + qualityScore;
  };

  // Enhanced paralegals with performance calculations
  const enhancedParalegals = paralegals.map(paralegal => ({
    ...paralegal,
    performanceIndex: calculatePerformanceIndex(paralegal),
  })).sort((a, b) => b.performanceIndex - a.performanceIndex);

  // Get performance level
  const getPerformanceLevel = (index: number) => {
    if (index >= 85) return { level: "Excellent", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    if (index >= 70) return { level: "Good", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
    if (index >= 50) return { level: "Average", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
    return { level: "Needs Improvement", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  };

  // Prepare chart data
  const chartData = enhancedParalegals.map(paralegal => ({
    name: paralegal.name.split(' ')[0], // First name only
    performance: paralegal.performanceIndex,
    utilization: paralegal.utilization || 0,
    quality: paralegal.qualityScore || 0,
  }));

  const avgPerformance = enhancedParalegals.reduce((sum, p) => sum + p.performanceIndex, 0) / enhancedParalegals.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Paralegal Performance Scorecard</h3>
          <p className="text-sm text-muted-foreground">
            Performance index (0-100) based on deadline compliance, speed, utilization, and quality
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{avgPerformance.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Average Score</p>
        </div>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4">Performance Rankings</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                type="number" 
                dataKey="performance" 
                tick={{ fontSize: 10 }}
                domain={[0, 100]}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                width={80}
              />
              <Tooltip 
                formatter={(value, name) => [
                  `${(value as number).toFixed(1)}`, 
                  name === 'performance' ? 'Performance Index' : (name as string).charAt(0).toUpperCase() + (name as string).slice(1)
                ]}
              />
              <Bar 
                dataKey="performance" 
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Individual Paralegal Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {enhancedParalegals.map((paralegal, index) => {
          const performanceLevel = getPerformanceLevel(paralegal.performanceIndex);
          const isTopPerformer = index === 0;
          const isLowPerformer = index >= enhancedParalegals.length - 1 && enhancedParalegals.length > 1;
          
          return (
            <Card 
              key={paralegal.id}
              className={`p-4 ${isTopPerformer ? 'border-green-200 dark:border-green-800' : isLowPerformer ? 'border-red-200 dark:border-red-800' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">{paralegal.name}</h4>
                    {isTopPerformer && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Top Performer
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{paralegal.email}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${performanceLevel.color}`}>
                  {performanceLevel.level}
                </div>
              </div>

              {/* Performance Index */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Performance Index</span>
                  <span className="text-sm font-bold">{paralegal.performanceIndex.toFixed(1)}</span>
                </div>
                <Progress 
                  value={paralegal.performanceIndex} 
                  className="h-2"
                />
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <div>
                    <p className="font-medium">{paralegal.onTimeRate.toFixed(0)}%</p>
                    <p className="text-muted-foreground">On-Time</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <div>
                    <p className="font-medium">{paralegal.avgDaysOpen.toFixed(0)}d</p>
                    <p className="text-muted-foreground">Avg Days</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-purple-500" />
                  <div>
                    <p className="font-medium">{(paralegal.utilization || 0).toFixed(0)}%</p>
                    <p className="text-muted-foreground">Utilization</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-amber-500" />
                  <div>
                    <p className="font-medium">{(paralegal.qualityScore || 0).toFixed(0)}</p>
                    <p className="text-muted-foreground">Quality</p>
                  </div>
                </div>
              </div>

              {/* Workload Summary */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Workload</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{paralegal.matterCount}</span>
                      <span className="text-muted-foreground">total</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-green-600">{paralegal.completedCount}</span>
                      <span className="text-muted-foreground">done</span>
                    </span>
                    {paralegal.overdueCount > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-red-600">{paralegal.overdueCount}</span>
                        <span className="text-muted-foreground">overdue</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Performance Distribution */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4">Performance Distribution</h4>
        <div className="space-y-3">
          {["Excellent", "Good", "Average", "Needs Improvement"].map((level, index) => {
            const count = enhancedParalegals.filter(p => {
              const score = p.performanceIndex;
              if (level === "Excellent") return score >= 85;
              if (level === "Good") return score >= 70 && score < 85;
              if (level === "Average") return score >= 50 && score < 70;
              return score < 50;
            }).length;
            
            const percentage = (count / enhancedParalegals.length) * 100;
            const colors = ["bg-green-500", "bg-blue-500", "bg-amber-500", "bg-red-500"];
            
            return (
              <div key={level} className="flex items-center gap-3">
                <div className="w-20 text-xs font-medium">{level}</div>
                <div className="flex-1">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`${colors[index]} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right">
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground">({percentage.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
