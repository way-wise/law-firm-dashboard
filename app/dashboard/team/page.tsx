import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import TeamTable from "./team-table";

interface TeamPageProps {
  searchParams: Promise<{
    page?: string;
    active?: string;
  }>;
}

const TeamPage = async ({ searchParams }: TeamPageProps) => {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : undefined;
  const active = params.active === "true" ? true : params.active === "false" ? false : undefined;

  const team = await client.team.get({
    page,
    active,
  });

  return <TeamTable team={team} />;
};

export default TeamPage;
