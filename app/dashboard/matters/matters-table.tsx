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
import { Eye, Pencil, Plus, Trash, Clock, ArrowLeft, Mail, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { useRouter } from "@bprogress/next";
import { useSearchParams } from "next/navigation";
import { useDebounceCallback } from "usehooks-ts";
import { client } from "@/lib/orpc/client";
import { toast } from "sonner";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { LuSearch } from "react-icons/lu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

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

interface StatusType {
  id: string;
  docketwiseId: number;
  name: string;
  duration: number | null;
  sort: number | null;
}

interface TeamMemberType {
  id: string;
  docketwiseId: number;
  fullName: string | null;
  email: string;
  isActive: boolean;
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
  statuses: StatusType[];
  teams: TeamMemberType[];
}

const MattersTable = ({ matters, matterTypes, statuses, teams }: MattersTableProps) => {
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
  const [sendingEmailForMatter, setSendingEmailForMatter] = useState<string | null>(null);
  
  // Auto-open VIEW drawer if matterId is in URL (from email links)
  useEffect(() => {
    const matterId = searchParams.get("matterId");
    if (matterId && matters.data.length > 0) {
      const matter = matters.data.find(m => m.id === matterId);
      if (matter && matter.docketwiseId) {
        setViewMatterDocketwiseId(matter.docketwiseId);
        setViewDrawerOpen(true);
      }
    }
  }, [searchParams, matters.data]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    if (from || to) {
      return {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      };
    }
    return undefined;
  });

  // Map teams to select options (use name as value for backend filtering)
  const assigneeOptions = teams
    .filter((t) => t.isActive)
    .map((t) => ({
      value: t.fullName || t.email,
      label: t.fullName || t.email,
      description: t.email,
    }));

  // Map matter types to select options
  const matterTypeOptions = matterTypes.map((mt) => ({
    value: mt.name,
    label: mt.name,
    description: mt.estimatedDays ? `Est. ${mt.estimatedDays} days` : undefined,
  }));

  // Map statuses to select options
  const statusOptions = statuses
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map((s) => ({
      value: s.name,
      label: s.name,
      description: s.duration ? `${s.duration} days` : undefined,
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

  const handleSendNotification = async (matter: MatterType) => {
    try {
      setSendingEmailForMatter(matter.id);
      const result = await client.customMatters.sendNotification({ matterId: matter.id });
      if (result.success) {
        toast.success("Notification sent to all recipients");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSendingEmailForMatter(null);
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
      accessorKey: "assignee",
      enableSorting: true,
      cell: ({ row }) => {
        // Use real assignee data from relation, fall back to legacy assignees field
        const assignee = row.original.assignee;
        const legacyAssignees = row.original.assignees;
        
        if (assignee && assignee.isActive) {
          return (
            <div className="flex flex-col">
              <p className="text-sm font-medium">{assignee.name}</p>
              <p className="text-xs text-muted-foreground">{assignee.email}</p>
            </div>
          );
        }
        
        // Fall back to legacy assignees field for backward compatibility
        return <p className="text-sm">{legacyAssignees || "-"}</p>;
      },
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
            {format(date, "MM/dd/yy HH:mm")}
          </p>
        );
      },
    },
    {
      header: "Assigned Date",
      accessorKey: "assignedDate",
      enableSorting: true,
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
      accessorKey: "calculatedDeadline",
      enableSorting: true,
      cell: ({ row }) => {
        const calculatedDeadline = row.original.calculatedDeadline;
        
        // Get estimated days from matter type
        const matterTypeForRow = row.original.matterTypeId 
          ? matterTypes.find(mt => mt.docketwiseId === row.original.matterTypeId)
          : null;
        const estimatedDays = matterTypeForRow?.estimatedDays;

        if (!calculatedDeadline || !estimatedDays) {
          return <p className="text-sm text-muted-foreground">-</p>;
        }

        const deadlineDate = new Date(calculatedDeadline);
        const now = new Date();
        const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine color: red if past/today, yellow if <= 7 days, default otherwise
        let dateColor = "text-muted-foreground";
        let daysLeftColor = "text-muted-foreground";
        let daysLeftText = "";
        
        if (daysLeft < 0) {
          dateColor = "text-red-500 font-medium";
          daysLeftColor = "text-red-500";
          daysLeftText = `${Math.abs(daysLeft)} days overdue`;
        } else if (daysLeft === 0) {
          dateColor = "text-red-500 font-medium";
          daysLeftColor = "text-red-500";
          daysLeftText = "Due today";
        } else if (daysLeft <= 7) {
          dateColor = "text-yellow-600 font-medium";
          daysLeftColor = "text-yellow-600";
          daysLeftText = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
        } else {
          daysLeftText = `${daysLeft} days left`;
        }

        return (
          <div className="flex flex-col">
            <p className={`text-sm ${dateColor}`}>
              {format(deadlineDate, "MM/dd/yyyy")}
            </p>
            {daysLeftText && (
              <p className={`text-xs ${daysLeftColor}`}>
                {daysLeftText}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: "Time Spent",
      accessorKey: "totalHoursElapsed",
      enableSorting: true,
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
      header: "Flat Fee",
      accessorKey: "flatFee",
      enableSorting: true,
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.flatFee != null ? `$${row.original.flatFee.toLocaleString()}` : "-"}
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
            onClick={() => handleSendNotification(row.original)}
            title="Send Email Notification"
            disabled={sendingEmailForMatter === row.original.id}
          >
            {sendingEmailForMatter === row.original.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
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
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Matters</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="/dashboard/matters/new">
                <Plus />
                New Matter
              </Link>
            </Button>
          </div>
        </div>

        {/* Card with filters and table */}
        <div className="rounded-xl border bg-card pb-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Input */}
              <InputGroup className="max-w-sm">
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
                    options={assigneeOptions}
                    value={searchParams.get("assignees") || ""}
                    onChange={(value: string) => updateFilters("assignees", value)}
                    placeholder="Filter by Assignee"
                    className="w-[240px]"
                    isClearable
                  />

                  <AdvancedSelect
                    options={matterTypeOptions}
                    value={searchParams.get("matterType") || ""}
                    onChange={(value: string) => updateFilters("matterType", value)}
                    placeholder="Filter by Type"
                    className="w-[280px]"
                    isClearable
                  />

                  <AdvancedSelect
                    options={statusOptions}
                    value={searchParams.get("status") || ""}
                    onChange={(value: string) => updateFilters("status", value)}
                    placeholder="Filter by Status"
                    className="w-[280px]"
                    isClearable
                  />

                  <Select
                    value={searchParams.get("activityStatus") || "all"}
                    onValueChange={(value) => updateFilters("activityStatus", value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activity</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="stale">Stale</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>

                  <DateRangePicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    placeholder="Filter by Date"
                    className="w-[260px]"
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LastSyncIndicator />
            </div>
          </div>

          {/* Table */}
          <DataTable
            data={matters.data}
            columns={columns}
            emptyMessage="No matters found"
            defaultSorting={[{ id: "docketwiseCreatedAt", desc: true }]}
          />

          {/* Pagination */}
          {matters.pagination && (
            <div className="flex items-center justify-between px-6 pt-4">
              <span className="text-sm text-muted-foreground">
                Showing {matters.data.length} of {matters.pagination.total} results
              </span>
              <div className="flex items-center gap-3">
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
            </div>
          )}
        </div>
      </div>

      {/* View Drawer - Fetches details on-demand */}
      <MatterViewDrawer
        docketwiseId={viewMatterDocketwiseId}
        open={viewDrawerOpen}
        onOpenChange={(open) => {
          setViewDrawerOpen(open);
          // Remove matterId from URL when closing
          if (!open) {
            const newParams = new URLSearchParams(searchParams.toString());
            if (newParams.has("matterId")) {
              newParams.delete("matterId");
              router.replace(`/dashboard/matters?${newParams.toString()}`);
            }
          }
        }}
      />

      {/* Edit Drawer */}
      <EditMatterDrawer
        matter={editMatter}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          // Remove matterId from URL when closing manually
          if (!open) {
            const newParams = new URLSearchParams(searchParams.toString());
            if (newParams.has("matterId")) {
              newParams.delete("matterId");
              router.replace(`/dashboard/matters?${newParams.toString()}`);
            }
          }
        }}
        onSuccess={() => {
          router.refresh();
          setEditDialogOpen(false);
          setEditMatter(null);
          // Remove matterId from URL when closing
          const newParams = new URLSearchParams(searchParams.toString());
          if (newParams.has("matterId")) {
            newParams.delete("matterId");
            router.replace(`/dashboard/matters?${newParams.toString()}`);
          }
        }}
        matterTypes={matterTypes}
        teams={teams}
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
