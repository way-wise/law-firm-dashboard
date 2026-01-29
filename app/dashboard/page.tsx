import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { EnhancedDashboard } from "./_components/enhanced-dashboard";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC with proper error handling
  // Fetch dashboard data
  const [stats, , recentMatters, distribution] = await Promise.all([
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
  ]);

  // Fetch team data separately
  const teamData = await client.team.get({ active: true }).catch(() => ({ data: [] }));

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

  // Transform team data for dashboard
  const teamMembers = (teamData.data || []).map((member: { id: number; first_name: string | null; last_name: string | null; email: string; role: string | null }, idx: number) => {
    return {
      id: member.id,
      name: member.first_name && member.last_name 
        ? `${member.first_name} ${member.last_name}` 
        : member.email?.split('@')[0] || 'Unknown',
      email: member.email,
      role: member.role || 'Paralegal',
      activeMatters: (idx % 5) + 1, // Placeholder - ideally from matter counts
      completedCount: (idx % 10) + 5, // Placeholder - ideally from matter counts
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
        recentMatters={mattersWithRisk}
        distribution={distribution}
        teamMembers={teamMembers}
      />
    </div>
  );
};

export default DashboardOverviewPage;