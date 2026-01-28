"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  XCircle,
  Trophy,
  Medal,
  Award,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

// Assignee stat from dashboard API
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

interface ParalegalKPIProps {
  assigneeStats?: AssigneeStat[];
}

// Map backend stats to display format
function mapPerformanceData(assigneeStats: AssigneeStat[]) {
  return assigneeStats.map((member) => {
    const status = member.onTimeRate >= 85 ? "good" : member.onTimeRate >= 70 ? "watch" : "alert";
    
    return { 
      name: member.name, 
      cases: member.matterCount, 
      onTime: member.onTimeRate, 
      avgDays: member.avgDaysOpen, 
      status 
    };
  });
}

// Fallback data when no assignees available
const fallbackParalegalData = [
  { name: "No team data", cases: 0, onTime: 0, avgDays: 0, status: "watch" as const },
];

// Status icon component
function StatusIcon({ status }: { status: string }) {
  if (status === "good") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  } else if (status === "watch") {
    return <AlertTriangle className="size-4 text-amber-500" />;
  }
  return <XCircle className="size-4 text-red-500" />;
}

// Rank icon component
function RankIcon({ rank }: { rank: number }) {
  if (rank === 0) {
    return <Trophy className="size-5 text-yellow-500" />;
  } else if (rank === 1) {
    return <Medal className="size-5 text-gray-400" />;
  } else if (rank === 2) {
    return <Award className="size-5 text-amber-600" />;
  }
  return <span className="text-sm font-medium text-muted-foreground">{rank + 1}</span>;
}

export function ParalegalKPI({ assigneeStats = [] }: ParalegalKPIProps) {
  // Use real assignee data if available, otherwise use fallback
  const paralegalData = assigneeStats.length > 0 
    ? mapPerformanceData(assigneeStats)
    : fallbackParalegalData;

  const totalCases = paralegalData.reduce((sum: number, p: { cases: number }) => sum + p.cases, 0);
  const avgOnTimeRate = paralegalData.length > 0 
    ? Math.round(paralegalData.reduce((sum: number, p: { onTime: number }) => sum + p.onTime, 0) / paralegalData.length)
    : 0;
  const avgDaysOpen = paralegalData.length > 0 
    ? (paralegalData.reduce((sum: number, p: { avgDays: number }) => sum + p.avgDays, 0) / paralegalData.length).toFixed(1)
    : "0";
  const overdueCases = paralegalData.reduce((sum: number, p: { status: string }) => sum + (p.status === "alert" ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold">Paralegal Performance</h3>
        <p className="text-sm text-muted-foreground">
          KPI metrics and team performance overview
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">Total Active Cases</p>
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">{totalCases}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-500">+12% from last month</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">On-Time Filing Rate</p>
            <div className="p-2 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">{avgOnTimeRate}%</div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-500">+3% improvement</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">Overdue Cases</p>
            <div className="p-2 rounded-lg bg-muted">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">{overdueCases}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span className="text-red-500">+2% needs attention</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">Avg Completion Time</p>
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">{avgDaysOpen} days</div>
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-500">-5% faster</span>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cases by Paralegal - Vertical Bar Chart */}
        <Card className="p-5">
          <h4 className="font-medium mb-4">Cases by Paralegal</h4>
          <div className="h-[220px] min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={paralegalData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(value) => value.split(" ")[0]}
                  interval={0}
                  angle={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value} cases`, "Cases"]}
                  labelFormatter={(label) => label}
                />
                <Bar 
                  dataKey="cases" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* Assignee Overview */}
      <Card className="p-5">
        <h4 className="font-medium mb-4">Assignee Overview</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Assignee</th>
                <th className="pb-3 font-medium text-right">Cases</th>
                <th className="pb-3 font-medium text-right">On-Time %</th>
                <th className="pb-3 font-medium text-right">Avg Days</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...paralegalData]
                .sort((a, b) => b.onTime - a.onTime)
                .map((paralegal, index) => (
                  <tr key={paralegal.name} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center justify-center w-8">
                        <RankIcon rank={index} />
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(paralegal.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{paralegal.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">{paralegal.cases}</td>
                    <td className="py-3 text-right">
                      <span className={paralegal.onTime >= 80 ? "text-emerald-500" : paralegal.onTime >= 70 ? "text-amber-500" : "text-red-500"}>
                        {paralegal.onTime}%
                      </span>
                    </td>
                    <td className="py-3 text-right">{paralegal.avgDays}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        paralegal.status === "good" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : paralegal.status === "watch"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        <StatusIcon status={paralegal.status} />
                        {paralegal.status === "good" ? "Good" : paralegal.status === "watch" ? "Watch" : "Alert"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
