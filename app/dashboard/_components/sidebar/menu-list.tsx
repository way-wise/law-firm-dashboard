import {
  Briefcase,
  FolderKanban,
  LayoutGrid,
  Settings,
  Users,
  UserRound,
  Shield,
  Tags,
  FileBarChart,
  Layers,
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
    title: "Matters",
    icon: <Briefcase className="icon" />,
    url: "/dashboard/matters",
  },
  {
    id: 3,
    title: "Contacts",
    icon: <UserRound className="icon" />,
    url: "/dashboard/contacts",
  },
  {
    id: 4,
    title: "Team",
    icon: <Users className="icon" />,
    url: "/dashboard/team",
  },
  {
    id: 5,
    title: "Users",
    icon: <Shield className="icon" />,
    url: "/dashboard/users",
  },
  {
    id: 6,
    title: "Matter Types",
    icon: <FolderKanban className="icon" />,
    url: "/dashboard/matter-types",
  },
  {
    id: 7,
    title: "Categories",
    icon: <Tags className="icon" />,
    url: "/dashboard/categories",
  },
  {
    id: 8,
    title: "Status Groups",
    icon: <Layers className="icon" />,
    url: "/dashboard/status-groups",
  },
  {
    id: 9,
    title: "Reports",
    icon: <FileBarChart className="icon" />,
    url: "/dashboard/reports",
  },
  {
    id: 10,
    title: "Settings",
    icon: <Settings className="icon" />,
    url: "/dashboard/settings",
  },
];
