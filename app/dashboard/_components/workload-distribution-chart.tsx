"use client";

import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

interface AssigneeStat {
  id: number;
  name: string;
  email: string;
  matterCount: number;
  completedCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDaysOpen: number;
}

interface WorkloadDistributionChartProps {
  assigneeStats: AssigneeStat[];
}

export function WorkloadDistributionChart({ assigneeStats }: WorkloadDistributionChartProps) {
  if (!assigneeStats || assigneeStats.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Team Workload Distribution</h3>
        <p className="text-muted-foreground text-sm">No team data available.</p>
      </Card>
    );
  }

  // Prepare data for chart - take top 8 team members
  const chartData = assigneeStats
    .slice(0, 8)
    .map(member => ({
      name: member.name.split(' ')[0], // First name only for better display
      active: member.matterCount - member.completedCount,
      completed: member.completedCount,
      overdue: member.overdueCount,
    }));

  const totalActive = chartData.reduce((sum, item) => sum + item.active, 0);
  const totalCompleted = chartData.reduce((sum, item) => sum + item.completed, 0);
  const totalOverdue = chartData.reduce((sum, item) => sum + item.overdue, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">
            Team Workload Distribution
          </h3>
          <p className="text-sm text-muted-foreground">
            Active vs completed matters by team member
          </p>
        </div>
        <Users className="h-5 w-5" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{totalActive}</div>
          <div className="text-xs text-muted-foreground">Active Matters</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{totalCompleted}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{totalOverdue}</div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="active" stackId="a" fill="#3b82f6" name="Active" />
            <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
            <Bar dataKey="overdue" stackId="a" fill="#f59e0b" name="Overdue" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-xs text-muted-foreground">Overdue</span>
        </div>
      </div>
    </Card>
  );
}
