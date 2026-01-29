"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/providers/sidebar-provider";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { LuX } from "react-icons/lu";
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
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Brand Logo" width={150} />
                <DrawerTitle className="sr-only text-xl font-medium">
                  Dashboard
                </DrawerTitle>
              </div>
              <DrawerClose
                className={cn(
                  buttonVariants({ variant: "secondary", size: "icon-lg" }),
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
      <div className="flex items-center justify-center border-b h-16">
        <img src="/logo.png" alt="Brand Logo" width={150} />
      </div>
      <SidebarMenu />
    </aside>
  );
};

export default Sidebar;
