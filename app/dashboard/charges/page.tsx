import { getCharges } from "@/data/charges";
import ChargesTable from "./charges-table";

const ChargesPage = () => {
  const chargesData = getCharges(1, 10);

  return <ChargesTable charges={chargesData} />;
};

export default ChargesPage;

