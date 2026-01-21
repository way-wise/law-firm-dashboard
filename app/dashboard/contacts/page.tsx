import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import ContactsTable from "./contacts-table";

interface ContactsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: "Person" | "Institution";
    filter?: "all";
  }>;
}

const ContactsPage = async ({ searchParams }: ContactsPageProps) => {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : undefined;
  const type = params.type;
  const filter = params.filter;

  const contacts = await client.contacts.get({
    page,
    type,
    filter,
  });

  return <ContactsTable contacts={contacts} />;
};

export default ContactsPage;
