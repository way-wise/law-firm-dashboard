"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MatterViewDrawer } from "@/components/matter-view-drawer";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  XCircle,
  Briefcase,
  Eye,
} from "lucide-react";
import { LuSearch } from "react-icons/lu";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDebounceCallback } from "usehooks-ts";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

// Types
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  drafting: number;
  rfes: number;
  filed: number;
  approved: number;
  denied: number;
  teamMembers: number;
}

interface AssigneeStat {
  id: number;
  name: string;
  email: string;
  matterCount: number;
  completedCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDaysOpen: number;
}

interface RecentMatter {
  id: string;
  docketwiseId: number;
  title: string;
  clientName: string | null;
  matterType: string | null;
  status: string | null;
  assignees: string | null;
  billingStatus: string | null;
  updatedAt: Date;
}

interface DashboardContentProps {
  stats: DashboardStats;
  assigneeStats: AssigneeStat[];
  recentMatters: RecentMatter[];
}

// Stats Cards Component
function StatsCards({ stats }: { stats: DashboardStats }) {
  const statsConfig = [
    {
      label: "Total Cases",
      value: stats.totalCases,
      icon: FileText,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "Active Cases",
      value: stats.activeCases,
      icon: Clock,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "In Progress",
      value: stats.drafting,
      icon: Briefcase,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "RFEs Pending",
      value: stats.rfes,
      icon: AlertTriangle,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      label: "Cases Filed",
      value: stats.filed,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Denied",
      value: stats.denied,
      icon: XCircle,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
    },
    {
      label: "Team Members",
      value: stats.teamMembers,
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((config) => {
        const Icon = config.icon;
        return (
          <Card key={config.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {config.label}
              </p>
              <div className={`rounded-lg p-2.5 ${config.iconBg}`}>
                <Icon className={`size-5 ${config.iconColor}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{config.value.toLocaleString()}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Team Performance Section
function TeamPerformance({ assigneeStats }: { assigneeStats: AssigneeStat[] }) {
  if (assigneeStats.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-lg font-semibold mb-4">Team Workload</h3>
        <p className="text-muted-foreground text-sm">No team members found. Sync data to see team workload.</p>
      </Card>
    );
  }

  // Sort by matter count descending
  const sortedStats = [...assigneeStats].sort((a, b) => b.matterCount - a.matterCount);

  return (
    <Card className="p-5">
      <h3 className="text-lg font-semibold mb-4">Team Workload</h3>
      <div className="space-y-4">
        {sortedStats.map((member) => (
          <div key={member.id} className="flex items-center gap-4">
            <Avatar className="size-10">
              <AvatarFallback className="text-sm">
                {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{member.matterCount}</p>
              <p className="text-xs text-muted-foreground">matters</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Recent Matters Table
function RecentMattersTable({ matters }: { matters: RecentMatter[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [viewMatterDocketwiseId, setViewMatterDocketwiseId] = useState<number | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  const handleView = (docketwiseId: number) => {
    setViewMatterDocketwiseId(docketwiseId);
    setViewDrawerOpen(true);
  };

  const debouncedSearch = useDebounceCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const params = new URLSearchParams(searchParams.toString());
    
    if (range?.from) {
      params.set("dateFrom", range.from.toISOString().split('T')[0]);
    } else {
      params.delete("dateFrom");
    }
    
    if (range?.to) {
      params.set("dateTo", range.to.toISOString().split('T')[0]);
    } else {
      params.delete("dateTo");
    }
    
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const columns: ColumnDef<RecentMatter>[] = [
    {
      header: "Client",
      accessorKey: "clientName",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.clientName || "-"}</p>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
            {row.original.title}
          </p>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "matterType",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.matterType || "-"}</p>
      ),
    },
    {
      header: "Assignee",
      accessorKey: "assignees",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">{row.original.assignees || "-"}</p>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = (row.original.status || "").toLowerCase();
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        
        if (status.includes("approved")) {
          variant = "default";
        } else if (status.includes("rfe") || status.includes("denied")) {
          variant = "destructive";
        } else if (status.includes("filed")) {
          variant = "outline";
        }
        
        return (
          <Badge variant={variant}>
            {row.original.status || "No Status"}
          </Badge>
        );
      },
    },
    {
      header: "Updated",
      accessorKey: "updatedAt",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
        </p>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleView(row.original.docketwiseId)}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Recent Matters</h3>
            <Badge variant="secondary">{matters.length}</Badge>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-3">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <LuSearch />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search matters..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </InputGroup>

          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Filter by date"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card">
          <DataTable
            data={matters}
            columns={columns}
            emptyMessage="No matters found. Sync data to see recent matters."
          />
        </div>
      </div>

      {/* View Drawer */}
      <MatterViewDrawer
        docketwiseId={viewMatterDocketwiseId}
        open={viewDrawerOpen}
        onOpenChange={setViewDrawerOpen}
      />
    </>
  );
}

// Main Dashboard Content Component
export function DashboardContent({ stats, assigneeStats, recentMatters }: DashboardContentProps) {
  return (
    <>
      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Team Workload */}
      <TeamPerformance assigneeStats={assigneeStats} />

      {/* Recent Matters */}
      <RecentMattersTable matters={recentMatters} />
    </>
  );
}
