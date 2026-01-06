import { clients } from "@/data/clients";
import ContactsTable from "./contacts-table";

const ContactsPage = () => {
  const paginatedContacts = {
    data: clients,
    meta: {
      page: 1,
      limit: 10,
      total: clients.length,
    },
  };

  return <ContactsTable clients={paginatedContacts} />;
};

export default ContactsPage;
