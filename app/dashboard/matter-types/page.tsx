import { client } from "@/lib/orpc/client";
import MatterTypesTable from "./matter-types-table";

const MatterTypesPage = async () => {
  const matterTypes = await client.matterTypes.get();
  const categories = await client.categories.get();

  return <MatterTypesTable matterTypes={matterTypes} categories={categories} />;
};

export default MatterTypesPage;
