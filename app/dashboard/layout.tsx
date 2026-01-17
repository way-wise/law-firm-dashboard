import { getSession } from "@/lib/auth";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { redirect } from "next/navigation";
import Header from "./_components/header";
import Sidebar from "./_components/sidebar";

const DashboardLayout = async ({ children }: LayoutProps<"/dashboard">) => {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <SidebarProvider>
      <div className="fixed flex size-full">
        <Sidebar />
        <div className="flex w-full flex-col overflow-hidden">
          <Header />
          <main className="grow overflow-y-auto bg-zinc-100 p-6 dark:bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
