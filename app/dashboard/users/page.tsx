import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import UsersTable from "./users-table";

const UsersPage = async () => {
  const headersList = await headers();
  
  const usersData = await auth.api.listUsers({
    query: { limit: 100 },
    headers: headersList,
  });

  const users = usersData?.users || [];

  return <UsersTable users={users} />;
};

export default UsersPage;