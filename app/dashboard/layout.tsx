import { NotificationProvider } from "@/providers/notification-provider";
import { SidebarProvider } from "@/providers/sidebar-provider";
import Header from "./_components/header";
import Notification from "./_components/notification";
import Sidebar from "./_components/sidebar";

const DashboardLayout = async ({ children }: LayoutProps<"/dashboard">) => {
  // TODO: Re-enable auth check when API is implemented
  // const session = await getSession();
  // if (!session) {
  //   redirect("/auth/sign-in");
  // }

  return (
    <NotificationProvider>
      <SidebarProvider>
        <div className="fixed flex size-full">
          <Sidebar />
          <div className="flex w-full flex-col overflow-hidden">
            <Header />
            <main className="grow overflow-y-auto bg-zinc-100 p-6 dark:bg-background">
              {children}
            </main>
            <Notification />
          </div>
        </div>
      </SidebarProvider>
    </NotificationProvider>
  );
};

export default DashboardLayout;
