"use client";

import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  CheckCircle2,
  Target,
  BarChart3,
} from "lucide-react";

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
      <span className="text-xs text-gray-500 font-medium">
        No trend data
      </span>
    );
  }
  
  const isPositive = trend > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const sign = isPositive ? '+' : '';
  
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">
        {sign}{trend.toFixed(1)}%
      </span>
    </div>
  );
};

// Executive Overview Cards
const executiveCards = [
  {
    key: "totalMatters",
    label: "Total Matters",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    key: "activeMatters",
    label: "Active Cases",
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    key: "overdueMatters",
    label: "Risk Alerts",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    key: "collectedRevenue",
    label: "Collected Revenue",
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
];

// Performance Metrics Cards
const performanceCards = [
  {
    key: "matterVelocity",
    label: "Matter Velocity",
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "Average days to completion",
  },
  {
    key: "onTimeRate",
    label: "On-Time Rate",
    icon: Target,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Deadline compliance rate",
  },
  {
    key: "teamUtilization",
    label: "Team Utilization",
    icon: BarChart3,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Active capacity percentage",
  },
  {
    key: "averageMatterValue",
    label: "Avg Matter Value",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "Average revenue per matter",
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
          <span className="text-xs text-purple-600 font-medium">
            +{Math.round((stats.activeMatters / stats.totalMatters) * 100)}% active
          </span>
        );
      case "overdueMatters":
        return (
          <span className={`text-xs font-medium ${stats.atRiskMatters > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
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

  const getPerformanceColor = (key: string, stats: EnhancedDashboardStats) => {
    switch (key) {
      case "onTimeRate":
        return stats.onTimeRate >= 85 ? "text-green-600" : stats.onTimeRate >= 70 ? "text-yellow-600" : "text-red-600";
      case "teamUtilization":
        return stats.teamUtilization >= 80 ? "text-green-600" : stats.teamUtilization >= 60 ? "text-yellow-600" : "text-red-600";
      default:
        return "text-orange-600";
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
              <Card key={card.key} className={`p-6 ${card.bgColor} ${card.borderColor} border`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className={`text-2xl font-bold ${card.color}`}>{value}</p>
                    </div>
                    <div className="mt-2">{trend}</div>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
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
            const color = getPerformanceColor(card.key, stats);
            
            return (
              <Card key={card.key} className={`p-6 ${card.bgColor} ${card.borderColor} border`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Stats Row */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Team & Operations</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Team Members</p>
                <p className="text-lg font-semibold">{stats.activeTeamMembers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-lg font-semibold">{stats.completedMatters}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs text-gray-600">At Risk</p>
                <p className="text-lg font-semibold">{stats.atRiskMatters}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Matter Types</p>
                <p className="text-lg font-semibold">{stats.totalMatterTypes}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-lg font-semibold">{formatCurrency(stats.pendingRevenue)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Unassigned</p>
                <p className="text-lg font-semibold">{stats.unassignedMatters}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
