"use client";

import { Card } from "@/components/ui/card";
import {
  FileText,
  Activity,
  AlertTriangle,
  DollarSign,
  Clock,
  Target,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export interface EnhancedDashboardStats {
  // Basic counts
  totalContacts: number;
  totalMatters: number;
  totalMatterTypes: number;
  teamMembers: number;
  categories: number;
  activeTeamMembers: number;
  matterTypesWithWorkflow: number;
  editedMatters: number;
  
  // Matter performance metrics
  activeMatters: number;
  completedMatters: number;
  overdueMatters: number;
  atRiskMatters: number;
  unassignedMatters: number;
  
  // Financial metrics
  totalRevenue: number;
  pendingRevenue: number;
  collectedRevenue: number;
  averageMatterValue: number;
  
  // Performance metrics
  matterVelocity: number;
  onTimeRate: number;
  teamUtilization: number;
  
  // Trend data (optional - may not have historical data)
  mattersTrend?: number;
  revenueTrend?: number;
}

interface EnhancedStatsCardsProps {
  stats: EnhancedDashboardStats;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTrend = (trend: number | undefined) => {
  if (trend === undefined || trend === 0) {
    return (
      <span className="text-xs text-muted-foreground font-medium">
        No trend data
      </span>
    );
  }
  
  const isPositive = trend > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const sign = isPositive ? '+' : '';
  
  return (
    <div className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">
        {sign}{trend.toFixed(1)}%
      </span>
    </div>
  );
};

// Generate subtle chart data for visual appeal
const generateChartData = (baseValue: number | string, points: number = 7) => {
  const data = [];
  const numValue = typeof baseValue === 'string' ? parseFloat(baseValue.replace(/[^0-9.-]/g, '')) || 0 : baseValue;
  
  for (let i = 0; i < points; i++) {
    const variation = Math.sin(i / 2) * 0.3 + (Math.random() - 0.5) * 0.2;
    data.push({
      value: Math.max(0, numValue * (1 + variation)),
    });
  }
  return data;
};

// Creative mini chart component with different types
const MiniChart = ({ data, color, type = 'line' }: { data: {value: number}[], color: string, type?: 'line' | 'area' | 'bar' | 'pie' }) => {
  if (type === 'pie') {
    // Simple pie chart for percentage-based metrics
    const pieData = data.slice(0, 3).map((item, index) => ({
      name: `Segment ${index + 1}`,
      value: item.value,
    }));
    
    return (
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={15}
              outerRadius={25}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8 - index * 0.2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <Bar dataKey="value" fill={color} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#gradient-${color})`}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// Executive Overview Cards - Creative chart types
const executiveCards = [
  {
    key: "totalMatters",
    label: "Total Matters",
    icon: FileText,
    chartType: 'line' as const,
    color: '#3b82f6',
  },
  {
    key: "activeMatters",
    label: "Active Cases",
    icon: Activity,
    chartType: 'area' as const,
    color: '#10b981',
  },
  {
    key: "overdueMatters",
    label: "Risk Alerts",
    icon: AlertTriangle,
    chartType: 'bar' as const,
    color: '#f59e0b',
  },
  {
    key: "collectedRevenue",
    label: "Collected Revenue",
    icon: DollarSign,
    chartType: 'area' as const,
    color: '#8b5cf6',
  },
];

// Performance Metrics Cards - Creative chart types
const performanceCards = [
  {
    key: "matterVelocity",
    label: "Matter Velocity",
    icon: Clock,
    description: "Average days to completion",
    chartType: 'pie' as const,
    color: '#ef4444',
  },
  {
    key: "onTimeRate",
    label: "On-Time Rate",
    icon: Target,
    description: "Deadline compliance rate",
    chartType: 'area' as const,
    color: '#10b981',
  },
  {
    key: "teamUtilization",
    label: "Team Utilization",
    icon: BarChart3,
    description: "Active capacity percentage",
    chartType: 'bar' as const,
    color: '#06b6d4',
  },
  {
    key: "averageMatterValue",
    label: "Avg Matter Value",
    icon: TrendingUp,
    description: "Average revenue per matter",
    chartType: 'line' as const,
    color: '#ec4899',
  },
];

export function EnhancedStatsCards({ stats }: EnhancedStatsCardsProps) {
  // Helper functions for dynamic values
  const getExecutiveValue = (key: string) => {
    switch (key) {
      case "totalMatters":
        return stats.totalMatters.toLocaleString();
      case "activeMatters":
        return stats.activeMatters.toLocaleString();
      case "overdueMatters":
        return stats.overdueMatters.toString();
      case "collectedRevenue":
        return formatCurrency(stats.collectedRevenue);
      default:
        return "0";
    }
  };

  const getExecutiveTrend = (key: string, stats: EnhancedDashboardStats) => {
    switch (key) {
      case "totalMatters":
        return formatTrend(stats.mattersTrend);
      case "activeMatters":
        return (
          <span className="text-xs text-muted-foreground font-medium">
            +{Math.round((stats.activeMatters / stats.totalMatters) * 100)}% active
          </span>
        );
      case "overdueMatters":
        return (
          <span className="text-xs text-muted-foreground font-medium">
            {stats.atRiskMatters > 0 ? `${stats.atRiskMatters} at-risk` : 'All on track'}
          </span>
        );
      case "collectedRevenue":
        return formatTrend(stats.revenueTrend);
      default:
        return null;
    }
  };

  const getPerformanceValue = (key: string, stats: EnhancedDashboardStats) => {
    switch (key) {
      case "matterVelocity":
        return `${stats.matterVelocity} days`;
      case "onTimeRate":
        return `${stats.onTimeRate}%`;
      case "teamUtilization":
        return `${stats.teamUtilization}%`;
      case "averageMatterValue":
        return formatCurrency(stats.averageMatterValue);
      default:
        return "0";
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Executive Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {executiveCards.map((card) => {
            const Icon = card.icon;
            const value = getExecutiveValue(card.key);
            const trend = getExecutiveTrend(card.key, stats);
            
            return (
              <Card key={card.key} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">{card.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-bold">{value}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-2 mb-3">{trend}</div>
                <MiniChart 
                  data={generateChartData(value)} 
                  color={card.color} 
                  type={card.chartType}
                />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {performanceCards.map((card) => {
            const Icon = card.icon;
            const value = getPerformanceValue(card.key, stats);
            
            return (
              <Card key={card.key} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">{card.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-bold">{value}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <MiniChart 
                  data={generateChartData(value)} 
                  color={card.color} 
                  type={card.chartType}
                />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Stats Row */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Team & Operations</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="text-lg font-semibold">{stats.activeTeamMembers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold">{stats.completedMatters}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">At Risk</p>
                <p className="text-lg font-semibold">{stats.atRiskMatters}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Matter Types</p>
                <p className="text-lg font-semibold">{stats.totalMatterTypes}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold">{formatCurrency(stats.pendingRevenue)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <div>
                <p className="text-xs text-muted-foreground">Unassigned</p>
                <p className="text-lg font-semibold">{stats.unassignedMatters}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
