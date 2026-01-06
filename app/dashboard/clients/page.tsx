import { clients } from "@/data/clients";
import ClientsTable from "./clients-table";

const ClientsPage = () => {
  const paginatedClients = {
    data: clients,
    meta: {
      page: 1,
      limit: 10,
      total: clients.length,
    },
  };

  return <ClientsTable clients={paginatedClients} />;
};

export default ClientsPage;
