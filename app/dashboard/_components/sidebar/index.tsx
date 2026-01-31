import { getSession } from "@/lib/auth";
import SidebarClient from "./sidebar-client";

const Sidebar = async () => {
  const session = await getSession();
  const userRole = session?.user?.role;

  return <SidebarClient userRole={userRole} />;
};

export default Sidebar;
