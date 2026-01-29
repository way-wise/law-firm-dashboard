"use client";

import { ExecutiveKPICards } from "./executive-kpi-cards";
import { CriticalAlertsPanel } from "./critical-alerts-panel";
import { ParalegalPerformanceCards } from "./paralegal-performance-cards";
import { MatterDistributionCharts } from "./matter-distribution-charts";
import { Card } from "@/components/ui/card";
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

interface AssigneeStat {
  id: number;
  name: string;
  email: string;
  matterCount: number;
  completedCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDaysOpen: number;
  performanceIndex: number;
  rfeRate: number;
  revisionRate: number;
  utilization: number;
  avgCycleTime: number;
  activeMatters: number;
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

interface EnhancedDashboardProps {
  stats: DashboardStats;
  assigneeStats: AssigneeStat[];
  recentMatters: RecentMatter[];
  distribution: {
    byType: Array<{ type: string; count: number }>;
    byComplexity: Array<{ level: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Recent Matters</h3>
            <Badge variant="secondary">{matters.length}</Badge>
          </div>
        </div>

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

        <div className="rounded-xl border bg-card">
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
  assigneeStats,
  recentMatters,
  distribution,
}: EnhancedDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Executive KPI Cards */}
      <ExecutiveKPICards stats={stats} />

      {/* Critical Alerts Panel */}
      <CriticalAlertsPanel stats={stats} />

      {/* Data Quality Warning */}
      {stats.dataQualityScore < 85 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                Data Quality: {stats.dataQualityScore}%
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Some metrics may be incomplete. Consider adding missing deadlines, pricing, and team assignments to improve accuracy.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Team Performance */}
      <ParalegalPerformanceCards paralegals={assigneeStats} />

      {/* Matter Distribution */}
      <MatterDistributionCharts
        byType={distribution.byType}
        byComplexity={distribution.byComplexity}
        byStatus={distribution.byStatus}
      />

      {/* Recent Matters Table */}
      <RecentMattersTable matters={recentMatters} />
    </div>
  );
}
