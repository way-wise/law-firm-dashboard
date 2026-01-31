"use client";

import MenuCollapsible from "./menu-collapsible";
import MenuCollapsibleItem from "./menu-collapsible-item";
import MenuItem from "./menu-item";
import { menuList } from "./menu-list";

interface SidebarMenuProps {
  userRole?: string | null;
}

const SidebarMenu = ({ userRole }: SidebarMenuProps) => {
  // Filter menu items based on user role
  const filteredMenu = menuList.filter((menu) => {
    // Only show Users menu to super admins
    if (menu.title === "Users" && userRole !== "super") {
      return false;
    }
    return true;
  });

  return (
    <nav className="grow space-y-1.5 overflow-y-auto p-6">
      {filteredMenu.map((menu) => {
        if (menu.submenu && menu.baseUrl) {
          return (
            <MenuCollapsible
              key={menu.id}
              icon={menu.icon}
              title={menu.title}
              baseUrl={menu.baseUrl}
            >
              {menu.submenu.map((submenu) => (
                <MenuCollapsibleItem key={submenu.id} {...submenu} />
              ))}
            </MenuCollapsible>
          );
        }

        if (menu.url) {
          return (
            <MenuItem
              key={menu.id}
              icon={menu.icon}
              title={menu.title}
              url={menu.url}
            />
          );
        }

        return null;
      })}
    </nav>
  );
};

export default SidebarMenu;
