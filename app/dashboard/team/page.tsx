import { workers } from "@/data/workers";
import TeamTable from "./team-table";

const TeamPage = () => {
  const paginatedWorkers = {
    data: workers,
    meta: {
      page: 1,
      limit: 10,
      total: workers.length,
    },
  };

  return <TeamTable workers={paginatedWorkers} />;
};

export default TeamPage;
