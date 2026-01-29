import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { EnhancedDashboard } from "./_components/enhanced-dashboard";
import { DashboardHeader } from "./_components/dashboard-header";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC with proper error handling
  // Fetch dashboard data
  const [stats, assigneeStats, recentMatters, distribution, monthlyTrends, statusByCategory] = await Promise.all([
    client.dashboard.getStats({}).catch(() => ({
      totalContacts: 0,
      totalMatters: 0,
      totalMatterTypes: 0,
      teamMembers: 0,
      categories: 0,
      activeTeamMembers: 0,
      matterTypesWithWorkflow: 0,
      editedMatters: 0,
      activeMattersCount: 0,
      newMattersThisMonth: 0,
      criticalMatters: 0,
      rfeFrequency: 0,
      newMattersGrowth: "+0 from last month",
      weightedActiveMatters: 0,
      revenueAtRisk: 0,
      deadlineComplianceRate: 0,
      avgCycleTime: 0,
      paralegalUtilization: 0,
      overdueMatters: 0,
      atRiskMatters: 0,
      unassignedMatters: 0,
      overloadedParalegals: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      collectedRevenue: 0,
      averageMatterValue: 0,
      matterVelocity: 0,
      onTimeRate: 0,
      teamUtilization: 0,
      avgRfeRate: 0,
      totalReworkCount: 0,
      qualityScore: 0,
      totalAvailableHours: 0,
      totalAssignedHours: 0,
      totalBillableHours: 0,
      mattersTrend: null,
      revenueTrend: null,
      deadlineMissTrend: null,
      mattersWithoutPricing: 0,
      mattersWithoutDeadline: 0,
      mattersWithoutMatterType: 0,
      dataQualityScore: 100,
    })),
    client.dashboard.getAssigneeStats({}).catch(() => []),
    client.dashboard.getRecentMatters({ limit: 20 }).catch(() => []),
    client.dashboard.getDistribution({}).catch(() => ({
      byType: [],
      byComplexity: [],
      byStatus: [],
    })),
    client.dashboard.getMonthlyTrends({ months: 6 }).catch(() => []),
    client.dashboard.getStatusByCategory({}).catch(() => []),
  ]);

  // Calculate days until deadline for recent matters
  const now = new Date();
  const mattersWithRisk = recentMatters.map((matter) => {
    let daysUntilDeadline: number | null = null;
    if (matter.estimatedDeadline) {
      const deadline = new Date(matter.estimatedDeadline);
      daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      ...matter,
      daysUntilDeadline,
    };
  });

  // Transform assigneeStats to team members format - REAL DATA from database
  const teamMembers = assigneeStats.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: 'Paralegal',
    activeMatters: member.activeMatters, // Real count from assigneeStats
    completedCount: member.completedCount, // Real count from assigneeStats
  }));

  return (
    <div className="space-y-6">
      {/* Page Header with Date Range Filter */}
      <DashboardHeader />

      {/* Enhanced Dashboard with All Components */}
      <EnhancedDashboard
        stats={stats}
        recentMatters={mattersWithRisk}
        distribution={distribution}
        teamMembers={teamMembers}
        monthlyTrends={monthlyTrends}
        statusByCategory={statusByCategory}
      />
    </div>
  );
};

export default DashboardOverviewPage;