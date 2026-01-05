import {
  CalendarCheck,
  LayoutGrid,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export interface SubMenuItem {
  id: number;
  title: string;
  url: string;
}

export interface MenuItem {
  id: number;
  title: string;
  icon: React.ReactElement;
  url?: string;
  baseUrl?: string;
  submenu?: SubMenuItem[];
}

export const menuList: MenuItem[] = [
  {
    id: 1,
    title: "Dashboard",
    icon: <LayoutGrid className="icon" />,
    url: "/dashboard",
  },
  {
    id: 2,
    title: "Todos",
    icon: <CalendarCheck className="icon" />,
    url: "/dashboard/todos",
  },
  {
    id: 3,
    title: "Users",
    icon: <UserRound className="icon" />,
    baseUrl: "/dashboard/users",
    submenu: [
      {
        id: 4,
        title: "Users",
        url: "/dashboard/users",
      },
      {
        id: 5,
        title: "Add User",
        url: "/dashboard/users/add",
      },
    ],
  },
  {
    id: 6,
    title: "Roles & Permissions",
    icon: <ShieldCheck className="icon" />,
    baseUrl: "/dashboard/roles",
    submenu: [
      {
        id: 7,
        title: "Roles",
        url: "/dashboard/roles",
      },
      {
        id: 8,
        title: "Add Role",
        url: "/dashboard/roles/add",
      },
      {
        id: 9,
        title: "Permissions",
        url: "/dashboard/roles/permissions",
      },
    ],
  },
  {
    id: 10,
    title: "Settings",
    icon: <Settings className="icon" />,
    url: "/dashboard/settings",
  },
];
