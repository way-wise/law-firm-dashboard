import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import { StatsCards } from "./_components/stats-cards";
import { ParalegalKPI } from "./_components/paralegal-kpi";
import { RecentMattersTable } from "./_components/recent-matters-table";

const DashboardOverviewPage = async () => {
  // Fetch all dashboard data from database via oRPC
  const [stats, assigneeStats, recentMatters] = await Promise.all([
    client.dashboard.getStats({}).catch(() => ({
      totalCases: 0,
      drafting: 0,
      rfes: 0,
      filed: 0,
      activeUnfiled: 0,
      monthlyGrowth: 0,
      teamMembers: 0,
      avgResolutionTime: 0,
    })),
    client.dashboard.getAssigneeStats({}).catch(() => []),
    client.dashboard.getRecentMatters({ limit: 10 }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your immigration law firm dashboard</p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Paralegal KPI Section with charts and leaderboard */}
      <ParalegalKPI assigneeStats={assigneeStats} />

      {/* Recent Matters Table */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
};

export default DashboardOverviewPage;