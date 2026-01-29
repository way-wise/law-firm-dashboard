"use client";

import { ExecutiveKPICards, SecondaryKPICards } from "./executive-kpi-cards";
import { WorkflowStageCards } from "./workflow-stage-cards";
import { AdjudicationTrends } from "./adjudication-trends";
import { TeamThroughput } from "./team-throughput";
import { TeamPerformanceCards } from "./team-performance-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MatterViewDrawer } from "@/components/matter-view-drawer";
import { DataTable } from "@/components/ui/data-table";
import { LuSearch } from "react-icons/lu";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Eye, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDebounceCallback } from "usehooks-ts";
import { useRouter, useSearchParams } from "next/navigation";

interface DashboardStats {
  activeMattersCount: number;
  newMattersThisMonth: number;
  criticalMatters: number;
  rfeFrequency: number;
  newMattersGrowth?: string;
  weightedActiveMatters: number;
  revenueAtRisk: number;
  deadlineComplianceRate: number;
  avgCycleTime: number;
  paralegalUtilization: number;
  overdueMatters: number;
  atRiskMatters: number;
  unassignedMatters: number;
  overloadedParalegals: number;
  dataQualityScore: number;
  mattersTrend?: number | null;
  revenueTrend?: number | null;
  deadlineMissTrend?: number | null;
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
  estimatedDeadline: Date | null;
  updatedAt: Date;
  daysUntilDeadline?: number | null;
}

interface TeamMemberData {
  id: number;
  name: string;
  email: string;
  role: string;
  activeMatters: number;
  completedCount: number;
}

interface EnhancedDashboardProps {
  stats: DashboardStats;
  recentMatters: RecentMatter[];
  distribution: {
    byType: Array<{ type: string; count: number }>;
    byComplexity: Array<{ level: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  teamMembers: TeamMemberData[];
}

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

  const getRiskBadge = (daysUntil: number | null | undefined) => {
    if (daysUntil === null || daysUntil === undefined) return null;
    
    if (daysUntil < 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" /> Overdue</Badge>;
    }
    if (daysUntil <= 7) {
      return <Badge variant="outline" className="gap-1 text-amber-600"><Clock className="size-3" /> {daysUntil}d</Badge>;
    }
    return <Badge variant="secondary">{daysUntil}d left</Badge>;
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
      header: "Deadline Risk",
      accessorKey: "daysUntilDeadline",
      cell: ({ row }) => getRiskBadge(row.original.daysUntilDeadline),
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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Recent Matters</h3>
          <Badge variant="secondary">{matters.length}</Badge>
        </div>

        <div className="rounded-xl border bg-card">
          {/* Filters inside card */}
          <div className="flex items-center gap-3 p-6 pb-4">
            <InputGroup className="flex-1 max-w-sm">
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
          <DataTable
            data={matters}
            columns={columns}
            emptyMessage="No matters found."
          />
        </div>
      </div>

      <MatterViewDrawer
        docketwiseId={viewMatterDocketwiseId}
        open={viewDrawerOpen}
        onOpenChange={setViewDrawerOpen}
      />
    </>
  );
}

export function EnhancedDashboard({
  stats,
  recentMatters,
  distribution,
  teamMembers,
}: EnhancedDashboardProps) {
  // Generate adjudication trends data (New Matters, Approved, Denied/RFE)
  const adjudicationData = [
    { month: 'Jul', newMatters: 18, approved: 15, rfe: 2 },
    { month: 'Aug', newMatters: 22, approved: 19, rfe: 1 },
    { month: 'Sep', newMatters: 24, approved: 20, rfe: 2 },
    { month: 'Oct', newMatters: 28, approved: 25, rfe: 1 },
    { month: 'Nov', newMatters: 26, approved: 23, rfe: 1 },
    { month: 'Dec', newMatters: 24, approved: 22, rfe: 2 },
  ];

  // Transform team members for throughput chart
  const teamThroughput = teamMembers.slice(0, 5).map(member => ({
    name: member.name.split(' ')[0], // First name only
    inbound: member.activeMatters,
    outbound: member.completedCount,
  }));

  // Use teamMembers from props for team performance cards
  const teamPerformanceData = teamMembers.map(member => ({
    name: member.name,
    activeMatters: member.activeMatters,
    completedCount: member.completedCount,
  }));

  return (
    <div className="space-y-5">
      {/* Row 1: Primary KPI Cards */}
      <ExecutiveKPICards stats={stats} />

      {/* Row 2: Secondary KPI Cards */}
      <SecondaryKPICards stats={stats} />

      {/* Row 3: Workflow Stage Cards */}
      <WorkflowStageCards distribution={distribution} />

      {/* Row 4: In-House Team Cards */}
      <TeamPerformanceCards members={teamPerformanceData} title="In-House Team" />

      {/* Row 5: Adjudication Trends + Paralegal Throughput */}
      <div className="grid gap-4 lg:grid-cols-5 min-h-[280px]">
        <div className="lg:col-span-3 h-full">
          <AdjudicationTrends data={adjudicationData} />
        </div>
        <div className="lg:col-span-2 h-full">
          <TeamThroughput data={teamThroughput} />
        </div>
      </div>

      {/* Row 6: Recent Matters Table */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
}
