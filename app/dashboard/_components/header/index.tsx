import ProfileDropdown from "@/components/ui/profile-dropdown";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { getSession } from "@/lib/auth";
import NotificationToggle from "./notification-toggle";
import SidebarToggle from "./sidebar-toggle";

const Header = async () => {
  const session = await getSession();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6 dark:bg-card">
      <div className="flex items-center gap-2">
        <SidebarToggle />
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <NotificationToggle />
        <ProfileDropdown session={session} />
      </div>
    </header>
  );
};

export default Header;
