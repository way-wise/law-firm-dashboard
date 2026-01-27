"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { LastSyncIndicator } from "@/components/last-sync-indicator";
import { EditMatterDrawer } from "@/components/edit-matter-drawer";
import { MatterViewDrawer } from "@/components/matter-view-drawer";
import { AdvancedSelect } from "@/components/ui/advanced-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MatterType } from "@/schema/customMatterSchema";
import { format, formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Eye, Pencil, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { useRouter } from "@bprogress/next";
import { useSearchParams } from "next/navigation";
import { useDebounceCallback } from "usehooks-ts";
import { client } from "@/lib/orpc/client";
import { toast } from "sonner";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { LuSearch } from "react-icons/lu";
import { workers } from "@/data/workers";

const getBillingStatusColor = (status: string | null) => {
  if (!status) return "secondary";
  switch (status) {
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
  if (!status) return "Not Set";
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

interface MatterTypeWithStatuses {
  id: string;
  docketwiseId: number;
  name: string;
  estimatedDays: number | null;
  matterStatuses: {
    id: string;
    docketwiseId: number;
    name: string;
    duration: number | null;
    sort: number | null;
  }[];
}

interface MattersTableProps {
  matters: {
    data: MatterType[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    } | null;
  };
  matterTypes: MatterTypeWithStatuses[];
}

const MattersTable = ({ matters, matterTypes }: MattersTableProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [viewMatterDocketwiseId, setViewMatterDocketwiseId] = useState<number | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [editMatter, setEditMatter] = useState<MatterType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteMatter, setDeleteMatter] = useState<MatterType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const paralegalOptions = workers
    .filter((w) => w.isActive && w.teamType === "inHouse")
    .map((w) => ({
      value: w.name,
      label: w.name,
      description: w.title,
    }));

  const handleView = (matter: MatterType) => {
    setViewMatterDocketwiseId(matter.docketwiseId);
    setViewDrawerOpen(true);
  };

  const handleEdit = (matter: MatterType) => {
    setEditMatter(matter);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (matter: MatterType) => {
    setDeleteMatter(matter);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteMatter) return;

    try {
      await client.customMatters.delete({ id: deleteMatter.id });
      toast.success("Matter deleted successfully");
      setDeleteDialogOpen(false);
      setDeleteMatter(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting matter:", error);
      toast.error("Failed to delete matter");
    }
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  // Debounced search handler
  const debouncedSearch = useDebounceCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }, 500);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const columns: ColumnDef<MatterType>[] = [
    {
      header: "Title",
      accessorKey: "title",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="font-medium truncate">{row.original.title}</p>
        </div>
      ),
    },
    {
      header: "Client",
      accessorKey: "clientName",
      enableSorting: true,
      cell: ({ row }) => (
        <p className="text-sm">{row.original.clientName || "-"}</p>
      ),
    },
    {
      header: "Assignees",
      accessorKey: "assignees",
      enableSorting: true,
      cell: ({ row }) => (
        <p className="text-sm">{row.original.assignees || "-"}</p>
      ),
    },
    {
      header: "Type",
      accessorKey: "matterType",
      enableSorting: true,
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
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: ({ row }) => {
        // Show workflow stage (status) if available, otherwise fall back to statusForFiling
        const displayStatus = row.original.status || row.original.statusForFiling;
        return (
          <Badge variant="outline">{displayStatus || "No Status"}</Badge>
        );
      },
    },
    {
      header: "Started At",
      accessorKey: "docketwiseCreatedAt",
      enableSorting: true,
      cell: ({ row }) => {
        const createdAt = row.original.docketwiseCreatedAt;
        if (!createdAt) return <p className="text-sm text-muted-foreground">-</p>;
        
        const date = new Date(createdAt);
        // Validate date (not 1970)
        if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
          return <p className="text-sm text-muted-foreground">-</p>;
        }
        
        return (
          <p className="text-sm text-muted-foreground">
            {format(date, "MMM dd, yyyy")}
          </p>
        );
      },
    },
    {
      header: "Deadline",
      accessorKey: "estimatedDeadline",
      enableSorting: true,
      cell: ({ row }) => {
        const customDeadline = row.original.estimatedDeadline;
        const calculatedDeadline = row.original.calculatedDeadline;
        
        // Prefer custom deadline if set, otherwise use calculated deadline
        let deadline = customDeadline;
        let isCalculated = false;
        
        // Validate custom deadline (not epoch/1970 date)
        if (deadline) {
          const date = new Date(deadline);
          const year = date.getFullYear();
          if (year <= 1970 || isNaN(year) || !isFinite(date.getTime())) {
            deadline = null;
          }
        }
        
        // Fall back to calculated deadline if no custom deadline
        if (!deadline && calculatedDeadline) {
          const calcDate = new Date(calculatedDeadline);
          const calcYear = calcDate.getFullYear();
          // Only use if valid (not 1970)
          if (calcYear > 1970 && !isNaN(calcYear) && isFinite(calcDate.getTime())) {
            deadline = calculatedDeadline;
            isCalculated = true;
          }
        }
        
        // No valid deadline found
        if (!deadline) return <p className="text-sm text-muted-foreground">-</p>;
        
        const date = new Date(deadline);
        const now = new Date();
        const isOverdue = date < now;
        const daysUntilDue = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isUpcoming = !isOverdue && daysUntilDue <= 7;
        
        // Color coding: red=overdue, yellow=within 7 days, normal=more than 7 days
        let colorClass = "text-muted-foreground";
        if (isOverdue) {
          colorClass = "text-red-500 font-semibold";
        } else if (isUpcoming) {
          colorClass = "text-yellow-600 font-medium";
        }
        
        // Get estimated days from matter type
        const matterTypeForRow = row.original.matterTypeId 
          ? matterTypes.find(mt => mt.docketwiseId === row.original.matterTypeId)
          : null;
        const estimatedDays = matterTypeForRow?.estimatedDays;
        
        return (
          <div className="flex flex-col">
            <p className={`text-sm ${colorClass}`}>
              {format(date, "MMM dd, yyyy")}
            </p>
            {isCalculated && estimatedDays && (
              <p className="text-xs text-muted-foreground/70">Est. Days {estimatedDays}</p>
            )}
            {isCalculated && !estimatedDays && (
              <p className="text-xs text-muted-foreground/70">No Est Set</p>
            )}
            {isUpcoming && (
              <p className="text-xs text-yellow-600">{daysUntilDue} days left</p>
            )}
          </div>
        );
      },
    },
    {
      header: "Billing Status",
      accessorKey: "billingStatus",
      enableSorting: true,
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
      header: "Total Hours",
      accessorKey: "totalHours",
      enableSorting: true,
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.totalHours != null ? `${row.original.totalHours}h` : "-"}
        </p>
      ),
    },
    {
      header: "Updated",
      accessorKey: "updatedAt",
      enableSorting: true,
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.updatedAt ? formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true }) : "-"}
        </p>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleView(row.original)}
            title="View"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
            title="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteClick(row.original)}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold">Matters</h1>
          </div>
          <Button asChild>
            <Link href="/dashboard/matters/new">
              <Plus />
              New Matter
            </Link>
          </Button>
        </div>

        {/* Card with filters and table */}
        <div className="rounded-xl border bg-card pb-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Input */}
              <InputGroup className="w-[280px]">
                <InputGroupAddon>
                  <LuSearch />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder="Search matters..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputGroup>

              {/* Filters */}
              {mounted && (
                <>
                  <Select
                    value={searchParams.get("billingStatus") || "all"}
                    onValueChange={(value) => updateFilters("billingStatus", value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Billing Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Billing</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                      <SelectItem value="PAYMENT_PLAN">Payment Plan</SelectItem>
                      <SelectItem value="DUE">Due</SelectItem>
                    </SelectContent>
                  </Select>

                  <AdvancedSelect
                    options={paralegalOptions}
                    value={searchParams.get("assignees") || ""}
                    onChange={(value: string) => updateFilters("assignees", value)}
                    placeholder="Filter by Assignee"
                    className="w-[180px]"
                    isClearable
                  />

                  <Select
                    value={searchParams.get("hasDeadline") || "all"}
                    onValueChange={(value) => updateFilters("hasDeadline", value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Deadline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Matters</SelectItem>
                      <SelectItem value="true">With Deadline</SelectItem>
                      <SelectItem value="false">No Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <LastSyncIndicator />
          </div>

          {/* Table */}
          <DataTable
            data={matters.data}
            columns={columns}
            emptyMessage="No matters found"
            defaultSorting={[{ id: "updatedAt", desc: true }]}
          />

          {/* Pagination */}
          {matters.pagination && matters.pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 px-6 pt-4">
              <span className="text-sm text-muted-foreground">
                Page {matters.pagination.page} of {matters.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(matters.pagination!.page - 1));
                  router.push(`?${params.toString()}`);
                }}
                disabled={matters.pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(matters.pagination!.page + 1));
                  router.push(`?${params.toString()}`);
                }}
                disabled={matters.pagination.page >= matters.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* View Drawer - Fetches details on-demand */}
      <MatterViewDrawer
        docketwiseId={viewMatterDocketwiseId}
        open={viewDrawerOpen}
        onOpenChange={setViewDrawerOpen}
      />

      {/* Edit Drawer */}
      <EditMatterDrawer
        matter={editMatter}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          router.refresh();
          setEditDialogOpen(false);
          setEditMatter(null);
        }}
        matterTypes={matterTypes}
      />

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Matter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteMatter?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MattersTable;
