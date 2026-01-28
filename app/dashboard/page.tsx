import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { EnhancedStatsCards } from "./_components/enhanced-stats-cards";
import { ParalegalKPI } from "./_components/paralegal-kpi";
import { RecentMattersTable } from "./_components/recent-matters-table";
import { MatterStatusChart } from "./_components/matter-status-chart";
import { MatterTypeChart } from "./_components/matter-type-chart";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC
  const [stats, assigneeStats, recentMatters, statusDistribution, typeDistribution] = await Promise.all([
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
    client.dashboard.getTypeDistribution({}).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your immigration law firm dashboard</p>
      </div>

      {/* Enhanced Stats Cards */}
      <EnhancedStatsCards stats={stats} />

      {/* Matter Distribution Charts */}
      <MatterStatusChart statusData={statusDistribution} />
      
      {/* Matter Type Chart */}
      <MatterTypeChart typeData={typeDistribution} />

      {/* Paralegal KPI Section with charts and leaderboard */}
      <ParalegalKPI assigneeStats={assigneeStats} />

      {/* Recent Matters Table */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
};

export default DashboardOverviewPage;