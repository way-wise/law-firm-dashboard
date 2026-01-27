"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Eye } from "lucide-react";
import Link from "next/link";

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
  updatedAt: Date;
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

const formatBillingStatus = (status: string | null) => {
  if (!status) return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export function RecentMattersTable({ matters }: RecentMattersTableProps) {
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
      cell: ({ row }) => (
        <p className="text-sm">{row.original.matterType || "-"}</p>
      ),
    },
    {
      header: "Assignee",
      accessorKey: "assignees",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.assignees || "-"}</p>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        // Show workflow stage (status) if available, otherwise fall back to statusForFiling
        const displayStatus = row.original.status || row.original.statusForFiling;
        return (
          <Badge variant="outline">{displayStatus || "No Status"}</Badge>
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
        
        // Prefer custom deadline if set, otherwise use calculated deadline
        let deadline = customDeadline;
        let isCalculated = false;
        
        // Check if custom deadline is valid (not epoch date)
        if (deadline) {
          const date = new Date(deadline);
          const year = date.getFullYear();
          if (year <= 1970 || isNaN(year)) {
            deadline = null;
          }
        }
        
        // Fall back to calculated deadline if no custom deadline
        if (!deadline && calculatedDeadline) {
          deadline = calculatedDeadline;
          isCalculated = true;
        }
        
        if (!deadline) return <p className="text-sm text-muted-foreground">-</p>;
        
        const date = new Date(deadline);
        const isOverdue = isCalculated ? isPastEstimatedDeadline : new Date() > date;
        
        return (
          <div className="flex flex-col">
            <p className={`text-sm ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              {date.toLocaleDateString()}
              {isOverdue && " (Overdue)"}
            </p>
            {isCalculated && (
              <p className="text-xs text-muted-foreground/70">Est. from type</p>
            )}
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
          asChild
          title="View in Matters"
        >
          <Link href={`/dashboard/matters?search=${encodeURIComponent(row.original.title)}`}>
            <Eye className="size-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Recent Matters</h3>
          <Badge variant="secondary">{matters.length}</Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/matters">View All Matters</Link>
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        <DataTable
          data={matters}
          columns={columns}
          emptyMessage="No matters found. Sync data to see recent matters."
        />
      </div>
    </div>
  );
}
