"use client";

import { buttonVariants } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import SidebarMenu from "./menu";

const Sidebar = () => {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
  const path = usePathname();

  // Hide sidebar on mobile when route changes
  useLayoutEffect(() => {
    void path;
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [path, isMobile, setOpenMobile]);

  if (isMobile) {
    return (
      <Drawer open={openMobile} onOpenChange={setOpenMobile}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image 
                  src="/logo.png" 
                  alt="Law Firm Dashboard" 
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                  priority
                  quality={100}
                />
                <DrawerTitle className="text-xl font-medium">
                  Dashboard
                </DrawerTitle>
              </div>
              <DrawerClose
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-lg" }),
                )}
              >
                <LuX />
              </DrawerClose>
            </div>
            <DrawerDescription className="sr-only">
              Mobile sidebar navigation
            </DrawerDescription>
          </DrawerHeader>
          <SidebarMenu />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <aside
      className={cn(
        "hidden w-72 shrink-0 flex-col border-r bg-card transition-[margin] duration-300 md:flex",
        {
          "-ml-72": state === "collapsed",
        },
      )}
    >
      <div className="flex items-center justify-center p-6 border-b">
        <Image 
          src="/logo.png" 
          alt="Law Firm Dashboard" 
          width={48}
          height={48}
          className="h-12 w-auto"
        />
      </div>
      <SidebarMenu />
    </aside>
  );
};

export default Sidebar;
