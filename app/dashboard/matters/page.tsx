import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import MattersTable from "./matters-table";

export const revalidate = 60; // Revalidate every 60 seconds

const MattersPage = async ({
  searchParams,
}: PageProps<"/dashboard/matters">) => {
  const { page, search, billingStatus, assignees, matterType, status, statusGroupId, dateFrom, dateTo, isStale, hasDeadline } = await searchParams;

  const [matters, matterTypes, teams, statusGroups] = await Promise.all([
    client.customMatters.get({
      page: page ? Number(page) : undefined,
      search: typeof search === "string" ? search : undefined,
      billingStatus: billingStatus as "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE" | undefined,
      assignees: typeof assignees === "string" ? assignees : undefined,
      matterType: typeof matterType === "string" ? matterType : undefined,
      status: typeof status === "string" ? status : undefined,
      statusGroupId: typeof statusGroupId === "string" ? statusGroupId : undefined,
      dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
      dateTo: typeof dateTo === "string" ? dateTo : undefined,
      isStale: isStale === "true" ? true : isStale === "false" ? false : undefined,
      hasDeadline: hasDeadline === "true" ? true : hasDeadline === "false" ? false : undefined,
    }),
    client.matterTypes.get(),
    client.team.get({ active: true }),
    client.statusGroups.get({ page: 1, perPage: 100 }),
  ]);

  // Extract unique statuses from matterTypes (all available workflow stages)
  const allStatuses = matterTypes.flatMap(mt => mt.matterStatuses || []);
  const uniqueStatuses = Array.from(new Map(allStatuses.map(s => [s.docketwiseId, s])).values());

  // Extract and map team members from response (API returns different structure)
  const teamData = Array.isArray(teams) ? teams : teams.data || [];
  const teamMembers = teamData
    .filter((t: { id?: number; docketwiseId?: number }) => t.id || t.docketwiseId)
    .map((t: {
      id?: number;
      docketwiseId?: number;
      first_name?: string;
      last_name?: string;
      email: string;
      active?: boolean;
    }) => ({
      id: String(t.id || t.docketwiseId!),
      docketwiseId: (t.id || t.docketwiseId)!,
      fullName: t.first_name && t.last_name 
        ? `${t.first_name} ${t.last_name}` 
        : t.first_name || t.last_name || null,
      email: t.email,
      isActive: t.active ?? true,
    }));

  return <MattersTable matters={matters} matterTypes={matterTypes} statuses={uniqueStatuses} teams={teamMembers} statusGroups={statusGroups.statusGroups} />;
};

export default MattersPage;
