import { getDashboardStats, getMatters } from "@/data/matters";
import { MatterFiltersList } from "./_components/matter-filters-list";
import { StatsCards } from "./_components/stats-cards";
import { ParalegalKPI } from "./_components/paralegal-kpi";

const DashboardOverviewPage = () => {
  const stats = getDashboardStats();
  const mattersData = getMatters(1, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your immigration law firm dashboard</p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Paralegal KPI Section */}
      <ParalegalKPI />

      {/* Recent Matters */}
      <MatterFiltersList matters={mattersData.data} meta={mattersData.meta} />
    </div>
  );
};

export default DashboardOverviewPage;