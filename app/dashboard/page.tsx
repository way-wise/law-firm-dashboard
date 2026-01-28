import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { HeroKPIs } from "./_components/hero-kpis";
import { TeamPerformance } from "./_components/team-performance";
import { MatterTrendsChart } from "./_components/matter-trends-chart";
import { RecentMattersTable } from "./_components/recent-matters-table";
import { RiskCommandCenter } from "./_components/risk-command-center";
import { ParalegalPerformanceScorecard } from "./_components/paralegal-performance-scorecard";
import { CapacityLoadAnalysis } from "./_components/capacity-load-analysis";
import { MatterFunnelAnalysis } from "./_components/matter-funnel-analysis";
import { DeadlineRiskMatrix } from "./_components/deadline-risk-matrix";

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
      
      // Executive KPIs (Top Row)
      weightedActiveMatters: 0,
      revenueAtRisk: 0,
      deadlineComplianceRate: 0,
      avgCycleTime: 0,
      paralegalUtilization: 0,
      
      // Risk Command Center
      overdueMatters: 0,
      atRiskMatters: 0,
      unassignedMatters: 0,
      overloadedParalegals: 0,
      
      // Financial metrics
      totalRevenue: 0,
      pendingRevenue: 0,
      collectedRevenue: 0,
      averageMatterValue: 0,
      
      // Performance metrics
      matterVelocity: 0,
      onTimeRate: 0,
      teamUtilization: 0,
      
      // Quality metrics
      avgRfeRate: 0,
      totalReworkCount: 0,
      qualityScore: 0,
      
      // Capacity analysis
      totalAvailableHours: 0,
      totalAssignedHours: 0,
      totalBillableHours: 0,
      
      // Trend data
      mattersTrend: undefined,
      revenueTrend: undefined,
      deadlineMissTrend: undefined,
    })),
    client.dashboard.getAssigneeStats({}).catch(() => []),
    client.dashboard.getRecentMatters({ limit: 15 }).catch(() => []),
  ]);

  
  // Prepare data for components
  const heroKPIStats = {
    weightedActiveMatters: stats.weightedActiveMatters,
    weightedActiveMattersTrend: stats.mattersTrend,
    revenueAtRisk: stats.revenueAtRisk,
    revenueAtRiskTrend: stats.revenueTrend,
    deadlineComplianceRate: stats.deadlineComplianceRate,
    avgCycleTime: stats.avgCycleTime,
    paralegalUtilization: stats.paralegalUtilization,
  };

  const alertBannerStats = {
    overdueMatters: stats.overdueMatters,
    atRiskMatters: stats.atRiskMatters,
    unassignedMatters: stats.unassignedMatters,
    overloadedParalegals: stats.overloadedParalegals,
    deadlineMissTrend: stats.deadlineMissTrend,
  };

  const teamPerformanceStats = {
    deadlineComplianceRate: stats.deadlineComplianceRate,
    avgCycleTime: stats.avgCycleTime,
    paralegalUtilization: stats.paralegalUtilization,
    qualityScore: stats.qualityScore,
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

      {/* 1. Hero KPIs - Executive Metrics */}
      <HeroKPIs stats={heroKPIStats} />

      {/* 2. Risk Command Center - Critical Alerts */}
      <RiskCommandCenter
        overdueMatters={alertBannerStats.overdueMatters}
        atRiskMatters={alertBannerStats.atRiskMatters}
        unassignedMatters={alertBannerStats.unassignedMatters}
        overloadedParalegals={alertBannerStats.overloadedParalegals}
        deadlineMissTrend={alertBannerStats.deadlineMissTrend}
      />

      {/* 3. Paralegal Performance Scorecard */}
      <ParalegalPerformanceScorecard paralegals={assigneeStats} />

      {/* 4. Capacity vs Load Analysis */}
      <CapacityLoadAnalysis
        totalAvailableHours={stats.totalAvailableHours}
        totalAssignedHours={stats.totalAssignedHours}
        totalBillableHours={stats.totalBillableHours}
        overloadedParalegals={stats.overloadedParalegals}
      />

      {/* 5. Matter Lifecycle Intelligence */}
      <MatterFunnelAnalysis matters={recentMatters as any} />

      {/* 6. Deadline Intelligence */}
      <DeadlineRiskMatrix 
        matters={recentMatters as any} 
        paralegals={assigneeStats as any}
      />

      {/* 7. Team Performance - Legacy */}
      <TeamPerformance
        assigneeStats={assigneeStats}
        stats={teamPerformanceStats}
      />

      {/* 8. Matter Trends - 6 Month Overview */}
      <MatterTrendsChart />

      {/* 9. Recent Activity - Latest Matters */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
};

export default DashboardOverviewPage;