import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { EnhancedDashboard } from "./_components/enhanced-dashboard";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC with proper error handling
  const [stats, assigneeStats, recentMatters, distribution] = await Promise.all([
    client.dashboard.getStats({}).catch(() => ({
      totalContacts: 0,
      totalMatters: 0,
      totalMatterTypes: 0,
      teamMembers: 0,
      categories: 0,
      activeTeamMembers: 0,
      matterTypesWithWorkflow: 0,
      editedMatters: 0,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Executive KPI monitoring and team performance analytics
        </p>
      </div>

      {/* Enhanced Dashboard with All Components */}
      <EnhancedDashboard
        stats={stats}
        assigneeStats={assigneeStats}
        recentMatters={mattersWithRisk}
        distribution={distribution}
      />
    </div>
  );
};

export default DashboardOverviewPage;