import { Button } from "@/components/ui/button";
import ProfileDropdown from "@/components/ui/profile-dropdown";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { getSession } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

const Navbar = async () => {
  const session = await getSession();

  return (
    <nav className="h-16 border-b border-border bg-white py-3 dark:bg-card">
      <div className="container flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.svg"
            alt="Brand Logo"
            width={100}
            height={40}
            priority
            className="h-auto w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          {session ? (
            <ProfileDropdown session={session} />
          ) : (
            <Button asChild>
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
