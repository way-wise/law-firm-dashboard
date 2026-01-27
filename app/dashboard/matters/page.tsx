import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import MattersTable from "./matters-table";

export const revalidate = 60; // Revalidate every 60 seconds

const MattersPage = async ({
  searchParams,
}: PageProps<"/dashboard/matters">) => {
  const { page, search, billingStatus, assignees, isStale, hasDeadline } = await searchParams;

  const [matters, matterTypes] = await Promise.all([
    client.customMatters.get({
      page: page ? Number(page) : undefined,
      search: typeof search === "string" ? search : undefined,
      billingStatus: billingStatus as "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE" | undefined,
      assignees: typeof assignees === "string" ? assignees : undefined,
      isStale: isStale === "true" ? true : isStale === "false" ? false : undefined,
      hasDeadline: hasDeadline === "true" ? true : hasDeadline === "false" ? false : undefined,
    }),
    client.matterTypes.get(),
  ]);

  return <MattersTable matters={matters} matterTypes={matterTypes} />;
};

export default MattersPage;
