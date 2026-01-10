import { client } from "@/lib/orpc/client";
import MattersTable from "./matters-table";

const MattersPage = async ({
  searchParams,
}: PageProps<"/dashboard/matters">) => {
  const { page, archived, client_id } = await searchParams;

  const matters = await client.matters.get({
    page: page ? Number(page) : undefined,
    archived: archived === "true" ? true : archived === "false" ? false : undefined,
    client_id: client_id ? Number(client_id) : undefined,
  });

  return <MattersTable matters={matters} />;
};

export default MattersPage;
