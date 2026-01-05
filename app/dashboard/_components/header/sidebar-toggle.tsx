"use client";

import { LuMenu } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";

const SidebarToggle = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
      size="icon-lg"
      variant="secondary"
    >
      <LuMenu />
    </Button>
  );
};

export default SidebarToggle;
