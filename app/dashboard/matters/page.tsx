import { getMatters } from "@/data/matters";
import MattersTable from "./matters-table";

const MattersPage = () => {
  const mattersData = getMatters(1, 10);

  return <MattersTable matters={mattersData} />;
};

export default MattersPage;
