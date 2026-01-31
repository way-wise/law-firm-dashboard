"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useProgress } from "@bprogress/next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuChevronDown,
  LuLayoutGrid,
  LuLogOut,
  LuUserRound,
} from "react-icons/lu";
import { toast } from "sonner";

type Session = typeof auth.$Infer.Session | null;
const ProfileDropdown = ({ session }: { session: Session }) => {
  const router = useRouter();
  const { start, stop } = useProgress();

  // Handle logout
  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onRequest: () => {
          start();
        },
        onSuccess: () => {
          router.replace("/auth/sign-in");
          stop();
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
          stop();
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-auto p-0 hover:bg-transparent",
        )}
      >
        <Avatar>
          <AvatarImage src="" alt="Profile image" />
          <AvatarFallback>{session?.user.name[0]}</AvatarFallback>
        </Avatar>
        <span className="max-w-28 truncate text-base">
          {session?.user.name}
        </span>
        <LuChevronDown className="opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LuLayoutGrid className="opacity-70" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <LuUserRound className="opacity-70" aria-hidden="true" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LuLogOut className="opacity-70" aria-hidden="true" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
