import {
  Briefcase,
  FolderKanban,
  GitBranch,
  LayoutGrid,
  Settings,
  Users,
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
    title: "Clients",
    icon: <UserRound className="icon" />,
    url: "/dashboard/clients",
  },
  {
    id: 3,
    title: "Team",
    icon: <Users className="icon" />,
    url: "/dashboard/team",
  },
  {
    id: 4,
    title: "Matters",
    icon: <Briefcase className="icon" />,
    url: "/dashboard/matters",
  },
  {
    id: 5,
    title: "Matter Types",
    icon: <FolderKanban className="icon" />,
    url: "/dashboard/matter-types",
  },
  {
    id: 6,
    title: "Workflow Stages",
    icon: <GitBranch className="icon" />,
    url: "/dashboard/workflow-stages",
  },
  {
    id: 7,
    title: "Settings",
    icon: <Settings className="icon" />,
    url: "/dashboard/settings",
  },
];
