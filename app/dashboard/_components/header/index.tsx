import ProfileDropdown from "@/components/ui/profile-dropdown";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { NotificationBell } from "@/components/notification-bell";
import NotificationToggle from "./notification-toggle";
import SidebarToggle from "./sidebar-toggle";

// Mock session for UI development
const mockSession = {
  user: {
    id: "mock-user-id",
    name: "John Doe",
    email: "john@lawfirm.com",
    image: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "mock-session-id",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "mock-user-id",
    token: "mock-token",
  },
};

const Header = async () => {
  // TODO: Re-enable when API is implemented
  // const session = await getSession();
  const session = mockSession;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6 dark:bg-card">
      <div className="flex items-center gap-2">
        <SidebarToggle />
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <NotificationBell />
        <NotificationToggle />
        <ProfileDropdown session={session} />
      </div>
    </header>
  );
};

export default Header;
