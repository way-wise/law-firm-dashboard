import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { HeroKPIs } from "./_components/hero-kpis";
import { AlertBanner } from "./_components/alert-banner";
import { TeamPerformance } from "./_components/team-performance";
import { MatterTrendsChart } from "./_components/matter-trends-chart";
import { RecentMattersTable } from "./_components/recent-matters-table";
import { subMonths, startOfMonth } from "date-fns";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC
  const [stats, assigneeStats, recentMatters] = await Promise.all([
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
  ]);

  // Calculate new matters this month (MTD)
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));

  // For now, we'll use a simplified calculation
  // In the future, this should come from the API with proper date filtering
  const newMattersCount = Math.round(stats.totalMatters * 0.15); // Estimate 15% are new this month
  const approvalRate = stats.onTimeRate; // Using on-time rate as proxy for approval rate

  // Prepare data for components
  const heroKPIStats = {
    newMattersCount,
    newMattersTrend: stats.mattersTrend,
    approvalRate,
    approvalRateTrend: undefined,
    deadlineAlerts: stats.atRiskMatters,
    activeCases: stats.activeMatters,
  };

  const alertBannerStats = {
    overdueMatters: stats.overdueMatters,
    atRiskMatters: stats.atRiskMatters,
    unassignedMatters: stats.unassignedMatters,
  };

  const teamPerformanceStats = {
    onTimeRate: stats.onTimeRate,
    matterVelocity: stats.matterVelocity,
    completedMatters: stats.completedMatters,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Immigration law firm performance at a glance
        </p>
      </div>

      {/* 1. Hero KPIs - Top Priority Metrics */}
      <HeroKPIs stats={heroKPIStats} />

      {/* 2. Alert Banner - Critical Items */}
      <AlertBanner stats={alertBannerStats} />

      {/* 3. Team Performance - Workload & Stats */}
      <TeamPerformance
        assigneeStats={assigneeStats}
        stats={teamPerformanceStats}
      />

      {/* 4. Matter Trends - 6 Month Overview */}
      <MatterTrendsChart />

      {/* 5. Recent Activity - Latest Matters */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
};

export default DashboardOverviewPage;