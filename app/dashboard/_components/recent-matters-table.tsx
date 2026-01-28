"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { MatterViewDrawer } from "@/components/matter-view-drawer";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow, format } from "date-fns";
import { Eye, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface RecentMatter {
  id: string;
  docketwiseId: number;
  title: string;
  clientName: string | null;
  matterType: string | null;
  matterTypeId: number | null;
  status: string | null;
  statusForFiling: string | null;
  assignees: string | null;
  billingStatus: string | null;
  estimatedDeadline: Date | null;
  calculatedDeadline?: Date | null;
  isPastEstimatedDeadline?: boolean;
  docketwiseCreatedAt: Date | null;
  assignedDate?: Date | null;
  updatedAt: Date;
  totalHoursElapsed?: number;
  daysUntilDeadline?: number;
  estimatedDays?: number | null;
}

interface RecentMattersTableProps {
  matters: RecentMatter[];
}

const getBillingStatusColor = (status: string | null) => {
  if (!status) return "secondary";
  switch (status.toUpperCase()) {
    case "PAID":
      return "default";
    case "DEPOSIT_PAID":
      return "secondary";
    case "PAYMENT_PLAN":
      return "outline";
    case "DUE":
      return "destructive";
    default:
      return "secondary";
  }
};

// Format deadline - only show if estimated days exist
const formatDeadline = (calculatedDeadline?: Date | null, isPastEstimatedDeadline?: boolean, hasEstimatedDays?: boolean) => {
  if (!calculatedDeadline || !hasEstimatedDays) return "-";
  
  const formattedDate = format(calculatedDeadline, "MM/dd/yyyy");
  
  if (isPastEstimatedDeadline) {
    return (
      <div className="flex flex-col">
        <p className="text-sm text-red-500 font-medium">{formattedDate}</p>
        <p className="text-xs text-red-500">Overdue</p>
      </div>
    );
  }
  
  return <p className="text-sm text-muted-foreground">{formattedDate}</p>;
};

// Format hours elapsed
const formatHoursElapsed = (totalHoursElapsed?: number) => {
  if (!totalHoursElapsed) return "-";
  
  if (totalHoursElapsed < 24) {
    return `${totalHoursElapsed}h`;
  } else if (totalHoursElapsed < 168) { // Less than 1 week
    const days = Math.floor(totalHoursElapsed / 24);
    const hours = totalHoursElapsed % 24;
    return `${days}d ${hours}h`;
  } else {
    const weeks = Math.floor(totalHoursElapsed / 168);
    const days = Math.floor((totalHoursElapsed % 168) / 24);
    return `${weeks}w ${days}d`;
  }
};

const formatBillingStatus = (status: string | null) => {
  if (!status) return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export function RecentMattersTable({ matters }: RecentMattersTableProps) {
  const [viewMatterDocketwiseId, setViewMatterDocketwiseId] = useState<number | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  const handleView = (docketwiseId: number) => {
    setViewMatterDocketwiseId(docketwiseId);
    setViewDrawerOpen(true);
  };

  const columns: ColumnDef<RecentMatter>[] = [
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="font-medium truncate">{row.original.title}</p>
        </div>
      ),
    },
    {
      header: "Client",
      accessorKey: "clientName",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.clientName || "-"}</p>
      ),
    },
    {
      header: "Type",
      accessorKey: "matterType",
      cell: ({ row }) => {
        const type = row.original.matterType;
        const status = row.original.status || row.original.statusForFiling;

        if (!type) return <p className="text-sm text-muted-foreground">-</p>;

        return (
          <div className="flex flex-col">
            <p className="text-sm font-medium">{type}</p>
            {status && (
              <p className="text-xs text-muted-foreground">{status}</p>
            )}
          </div>
        );
      },
    },
    {
      header: "Assignee",
      accessorKey: "assignees",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.assignees || "-"}</p>
      ),
    },
    {
      header: "Started At",
      accessorKey: "docketwiseCreatedAt",
      cell: ({ row }) => {
        const createdAt = row.original.docketwiseCreatedAt;
        if (!createdAt) return <p className="text-sm text-muted-foreground">-</p>;

        const date = new Date(createdAt);
        if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
          return <p className="text-sm text-muted-foreground">-</p>;
        }

        return (
          <p className="text-sm text-muted-foreground">
            {format(date, "MM/dd/yy HH:mm")}
          </p>
        );
      },
    },
    {
      header: "Assigned Date",
      accessorKey: "assignedDate",
      cell: ({ row }) => {
        const assignedDate = row.original.assignedDate;
        if (!assignedDate) return <p className="text-sm text-muted-foreground">-</p>;

        const date = new Date(assignedDate);
        if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
          return <p className="text-sm text-muted-foreground">-</p>;
        }

        return (
          <p className="text-sm text-muted-foreground">
            {format(date, "MM/dd/yy HH:mm")}
          </p>
        );
      },
    },
    {
      header: "Deadline",
      accessorKey: "estimatedDeadline",
      cell: ({ row }) => {
        const customDeadline = row.original.estimatedDeadline;
        const calculatedDeadline = row.original.calculatedDeadline;
        const isPastEstimatedDeadline = row.original.isPastEstimatedDeadline;
        const estimatedDays = row.original.estimatedDays;

        // Prefer custom deadline if set, otherwise use calculated deadline
        let deadline = customDeadline;

        // Check if custom deadline is valid (not epoch date)
        if (deadline) {
          const date = new Date(deadline);
          const year = date.getFullYear();
          if (year <= 1970 || isNaN(year)) {
            deadline = null;
          }
        }

        // Fall back to calculated deadline if no custom deadline AND we have estimated days
        if (!deadline && calculatedDeadline && estimatedDays) {
          return formatDeadline(calculatedDeadline, isPastEstimatedDeadline, true);
        }

        if (!deadline) return <p className="text-sm text-muted-foreground">-</p>;

        const date = new Date(deadline);
        const isOverdue = new Date() > date;

        return (
          <div className="flex flex-col">
            <p className={`text-sm ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              {format(date, "MM/dd/yyyy")}
              {isOverdue && " (Overdue)"}
            </p>
          </div>
        );
      },
    },
    {
      header: "Time Spent",
      accessorKey: "totalHoursElapsed",
      cell: ({ row }) => {
        const hoursElapsed = row.original.totalHoursElapsed;
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{formatHoursElapsed(hoursElapsed)}</span>
          </div>
        );
      },
    },
    {
      header: "Billing",
      accessorKey: "billingStatus",
      cell: ({ row }) => {
        const status = row.original.billingStatus;
        if (!status) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <Badge variant={getBillingStatusColor(status) as "default" | "secondary" | "destructive" | "outline"}>
            {formatBillingStatus(status)}
          </Badge>
        );
      },
    },
    {
      header: "Updated",
      accessorKey: "updatedAt",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.updatedAt
            ? formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })
            : "-"}
        </p>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleView(row.original.docketwiseId)}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold">Recent Matters</h4>
          <p className="text-sm text-muted-foreground">
            Latest {matters.length} matters from Docketwise
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/matters">View All</Link>
        </Button>
      </div>

      <DataTable
        data={matters}
        columns={columns}
        emptyMessage="No matters found. Sync data to see recent matters."
      />

      {/* View Drawer */}
      <MatterViewDrawer
        docketwiseId={viewMatterDocketwiseId}
        open={viewDrawerOpen}
        onOpenChange={setViewDrawerOpen}
      />
    </Card>
  );
}
