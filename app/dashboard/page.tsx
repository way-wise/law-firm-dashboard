import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { EnhancedStatsCards } from "./_components/enhanced-stats-cards";
import { ParalegalKPI } from "./_components/paralegal-kpi";
import { RecentMattersTable } from "./_components/recent-matters-table";
import { MatterStatusChart } from "./_components/matter-status-chart";
import { PerformanceTrendsChart } from "./_components/performance-trends-chart";
import { WorkloadDistributionChart } from "./_components/workload-distribution-chart";
import { AnalyticsOverviewChart } from "./_components/analytics-overview-chart";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC
  const [stats, assigneeStats, recentMatters, statusDistribution] = await Promise.all([
    client.dashboard.getStats({}).catch(() => ({
      totalContacts: 0,
      totalMatters: 0,
      totalMatterTypes: 0,
      teamMembers: 0,
      categories: 0,
      activeTeamMembers: 0,
      matterTypesWithWorkflow: 0,
      editedMatters: 0,
      activeMatters: 0,
      completedMatters: 0,
      overdueMatters: 0,
      atRiskMatters: 0,
      unassignedMatters: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      collectedRevenue: 0,
      averageMatterValue: 0,
      matterVelocity: 0,
      onTimeRate: 0,
      teamUtilization: 0,
      mattersTrend: undefined,
      revenueTrend: undefined,
    })),
    client.dashboard.getAssigneeStats({}).catch(() => []),
    client.dashboard.getRecentMatters({ limit: 15 }).catch(() => []),
    client.dashboard.getStatusDistribution({}).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-muted-foreground dark:text-gray-400">Welcome to your immigration law firm dashboard</p>
      </div>

      {/* Enhanced Stats Cards */}
      <EnhancedStatsCards stats={stats} />

      {/* Status Distribution */}
      <MatterStatusChart statusData={statusDistribution} />

      {/* Performance Trends Chart */}
      <PerformanceTrendsChart stats={stats} />

      {/* Paralegal Performance Section */}
      <ParalegalKPI assigneeStats={assigneeStats} />

      {/* Analytics Overview Chart */}
      <AnalyticsOverviewChart stats={stats} />

      {/* Workload Distribution Chart */}
      <WorkloadDistributionChart assigneeStats={assigneeStats} />

      {/* Recent Matters Table */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
};

export default DashboardOverviewPage;