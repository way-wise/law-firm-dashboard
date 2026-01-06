import { matterTypes } from "@/data/matter-types";
import MatterTypesTable from "./matter-types-table";

const MatterTypesPage = () => {
  const paginatedMatterTypes = {
    data: matterTypes,
    meta: {
      page: 1,
      limit: 10,
      total: matterTypes.length,
    },
  };

  return <MatterTypesTable matterTypes={paginatedMatterTypes} />;
};

export default MatterTypesPage;
