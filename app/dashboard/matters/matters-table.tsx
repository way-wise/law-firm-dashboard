"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingStatus, Matter } from "@/data/matters";
import { matterTypes } from "@/data/matter-types";
import { workflowStages } from "@/data/workflow-stages";
import { workers } from "@/data/workers";
import { formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { MatterDetailSheet } from "../_components/matter-detail-sheet";

interface MattersTableProps {
  matters: {
    data: Matter[];
    meta: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

const billingStatusVariant: Record<BillingStatus, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  pending: "warning",
  partial: "secondary",
  paid: "success",
  overdue: "destructive",
  waived: "default",
};

const MattersTable = ({ matters }: MattersTableProps) => {
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeStages = workflowStages.filter((s) => s.isActive && !s.isTerminal);
  const activeWorkers = workers.filter((w) => w.isActive);
  const activeMatterTypes = matterTypes.filter((mt) => mt.isActive);

  const handleView = (matter: Matter) => {
    setSelectedMatter(matter);
    setSheetOpen(true);
  };

  const columns: ColumnDef<Matter>[] = [
    {
      header: "Case #",
      accessorKey: "caseNumber",
      cell: ({ row }) => (
        <span className="font-medium text-muted-foreground">{row.original.caseNumber}</span>
      ),
    },
    {
      header: "Client",
      accessorKey: "clientName",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.clientName}</p>
          <p className="text-sm text-muted-foreground">{row.original.clientEmail}</p>
        </div>
      ),
    },
    {
      header: "Matter Type",
      accessorKey: "matterTypeName",
    },
    {
      header: "Paralegal",
      accessorKey: "assignedWorkerName",
      cell: ({ row }) => row.original.assignedWorkerName || "-",
    },
    {
      header: "Billing",
      accessorKey: "billingStatus",
      cell: ({ row }) => (
        <Badge variant={billingStatusVariant[row.original.billingStatus]}>
          {row.original.billingStatus.charAt(0).toUpperCase() + row.original.billingStatus.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Stage",
      accessorKey: "currentStageName",
      cell: ({ row }) => (
        <Badge
          style={{ backgroundColor: row.original.currentStageColor, color: "#fff" }}
        >
          {row.original.currentStageName}
        </Badge>
      ),
    },
    {
      header: "Last Touch",
      accessorKey: "updatedAt",
      cell: ({ row }) => formatDistanceToNow(row.original.updatedAt, { addSuffix: true }),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row.original)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/matters/${row.original.id}/edit`}>Edit Matter</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Reassign Paralegal</DropdownMenuItem>
            <DropdownMenuItem>Update Stage</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handlePageChange = (page: string) => {
    console.log("Page changed to:", page);
  };

  const handleLimitChange = (limit: string) => {
    console.log("Limit changed to:", limit);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Matters</h1>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/dashboard/matters/new">
            <Plus className="mr-2 size-4" />
            New Matter
          </Link>
        </Button>
      </div>

      {/* Filters Card */}
      <div className="mb-6 rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Filters</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by client name, email, paralegal, or case ID..."
            className="pl-10"
          />
        </div>

        {/* Filter Row 1 */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {activeStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Matter Type</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {activeMatterTypes.map((mt) => (
                  <SelectItem key={mt.id} value={mt.id}>
                    {mt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Paralegal</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Paralegals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Paralegals</SelectItem>
                {activeWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Row 2 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Billing Status</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Date From</label>
            <Input type="date" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Date To</label>
            <Input type="date" />
          </div>
        </div>
      </div>

      {/* Matter List */}
      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium">Matter List</h2>
          <span className="text-sm text-muted-foreground">{matters.meta.total} cases</span>
        </div>

        <DataTable
          data={matters.data}
          columns={columns}
          emptyMessage="No matters available"
        />
        <Pagination
          meta={matters.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      <MatterDetailSheet
        matter={selectedMatter}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
};

export default MattersTable;
