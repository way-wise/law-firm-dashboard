"use client";

import { buttonVariants } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
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
            <div className="flex flex-col">
              <DrawerTitle className="text-xl font-medium">
                Brand Logo
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Mobile sidebar navigation
              </DrawerDescription>
            </div>
            <DrawerClose
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
              )}
            >
              <LuX />
            </DrawerClose>
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
      <SidebarMenu />
    </aside>
  );
};

export default Sidebar;
