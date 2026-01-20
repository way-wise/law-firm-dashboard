import { getDashboardStats, getMatters } from "@/data/matters";
import { getDocketwiseToken } from "@/lib/docketwise";
import { MatterFiltersList } from "./_components/matter-filters-list";
import { StatsCards } from "./_components/stats-cards";
import { ParalegalKPI } from "./_components/paralegal-kpi";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Fetch team members from Docketwise
async function getTeamMembers() {
  try {
    const token = await getDocketwiseToken();
    if (!token) return [];

    const response = await fetch(`${DOCKETWISE_API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const DashboardOverviewPage = async () => {
  const stats = getDashboardStats();
  const mattersData = getMatters(1, 10);
  const teamMembers = await getTeamMembers();

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
      <ParalegalKPI teamMembers={teamMembers} />

      {/* Recent Matters */}
      <MatterFiltersList matters={mattersData.data} meta={mattersData.meta} />
    </div>
  );
};

export default DashboardOverviewPage;