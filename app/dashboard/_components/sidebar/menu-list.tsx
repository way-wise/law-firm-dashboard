import {
  Briefcase,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutGrid,
  Receipt,
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
    title: "Contacts",
    icon: <UserRound className="icon" />,
    url: "/dashboard/contacts",
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
    title: "Documents",
    icon: <FileText className="icon" />,
    url: "/dashboard/documents",
  },
  {
    id: 6,
    title: "Charges",
    icon: <CreditCard className="icon" />,
    url: "/dashboard/charges",
  },
  {
    id: 7,
    title: "Matter Types",
    icon: <FolderKanban className="icon" />,
    url: "/dashboard/matter-types",
  },
  {
    id: 8,
    title: "Invoices",
    icon: <Receipt className="icon" />,
    url: "/dashboard/invoices",
  },
  {
    id: 9,
    title: "Settings",
    icon: <Settings className="icon" />,
    url: "/dashboard/settings",
  },
];
