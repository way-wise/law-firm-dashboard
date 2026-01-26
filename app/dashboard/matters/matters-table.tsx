"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { LastSyncIndicator } from "@/components/last-sync-indicator";
import { EditMatterDrawer } from "@/components/edit-matter-drawer";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import type { MatterType } from "@/schema/customMatterSchema";
import { format, formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Eye, FileText, Pencil, Plus, Trash, User, X } from "lucide-react";
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
}

const MattersTable = ({ matters }: MattersTableProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [viewMatter, setViewMatter] = useState<MatterType | null>(null);
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
    setViewMatter(matter);
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
      router.refresh();
    } catch (error) {
      console.error("Error deleting matter:", error);
      toast.error("Failed to delete matter");
    }
  };

  const handleSuccess = () => {
    router.refresh();
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
      header: "Assignees",
      accessorKey: "assignees",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.assignees || "-"}</p>
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
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.estimatedDeadline
            ? new Date(row.original.estimatedDeadline).toLocaleDateString()
            : "-"}
        </p>
      ),
    },
    {
      header: "Billing Status",
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
      header: "Total Hours",
      accessorKey: "totalHours",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.totalHours != null ? `${row.original.totalHours}h` : "-"}
        </p>
      ),
    },
    {
      header: "Updated",
      accessorKey: "updatedAt",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {row.original.updatedAt ? formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true }) : "-"}
        </p>
      ),
    },
    {
      id: "actions",
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

      {/* View Drawer */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen} direction="right">
        <DrawerContent side="right" className="w-full max-w-2xl overflow-x-hidden">
          {viewMatter && (
            <>
              <DrawerHeader>
                <div className="flex flex-col gap-1">
                  <DrawerTitle className="text-xl font-medium">{viewMatter.title}</DrawerTitle>
                  <DrawerDescription className="flex items-center gap-2">
                    {viewMatter.matterType && <span>{viewMatter.matterType}</span>}
                    {viewMatter.matterType && viewMatter.clientName && <span>•</span>}
                    {viewMatter.clientName && <span>{viewMatter.clientName}</span>}
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon-lg">
                    <X />
                  </Button>
                </DrawerClose>
              </DrawerHeader>

              <div className="flex flex-col gap-6 overflow-y-auto overflow-x-hidden p-6">
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {viewMatter.status && (
                    <Badge variant="outline">{viewMatter.status}</Badge>
                  )}
                  {viewMatter.statusForFiling && (
                    <Badge variant="secondary">{viewMatter.statusForFiling}</Badge>
                  )}
                  {viewMatter.billingStatus && (
                    <Badge variant={getBillingStatusColor(viewMatter.billingStatus) as "default" | "secondary" | "destructive" | "outline"}>
                      {formatBillingStatus(viewMatter.billingStatus)}
                    </Badge>
                  )}
                  {viewMatter.isEdited && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">Customized</Badge>
                  )}
                </div>

                <Separator />

                {/* Matter Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Matter Information</h4>
                  
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Matter Type</p>
                        <p className="text-sm font-medium">{viewMatter.matterType || "Not specified"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Client Name</p>
                        <p className="text-sm font-medium">{viewMatter.clientName || "Unknown"}</p>
                      </div>
                    </div>

                    {viewMatter.description && (
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Description</p>
                          <p className="text-sm font-medium">{viewMatter.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Assignees</p>
                        <p className="text-sm font-medium">{viewMatter.assignees || "Not assigned"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium">{viewMatter.status || "No Status"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Billing Status</p>
                        {viewMatter.billingStatus ? (
                          <Badge variant={getBillingStatusColor(viewMatter.billingStatus) as "default" | "secondary" | "destructive" | "outline"}>
                            {formatBillingStatus(viewMatter.billingStatus)}
                          </Badge>
                        ) : (
                          <p className="text-sm font-medium text-muted-foreground">Not Set</p>
                        )}
                      </div>
                    </div>

                    {viewMatter.statusForFiling && (
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status For Filing</p>
                          <p className="text-sm font-medium">{viewMatter.statusForFiling}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Hours</p>
                        <p className="text-sm font-medium">{viewMatter.totalHours != null ? `${viewMatter.totalHours} hours` : "Not recorded"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deadlines & Dates */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deadlines & Dates</h4>
                  
                  <div className="grid gap-3">
                    {viewMatter.assignedDate && (
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <Calendar className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Assigned Date</p>
                          <p className="text-sm font-medium">{format(new Date(viewMatter.assignedDate), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    )}

                    {viewMatter.estimatedDeadline && (
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <Calendar className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Estimated Deadline</p>
                          <p className="text-sm font-medium">{format(new Date(viewMatter.estimatedDeadline), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    )}

                    {viewMatter.actualDeadline && (
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <Calendar className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Actual Deadline</p>
                          <p className="text-sm font-medium">{format(new Date(viewMatter.actualDeadline), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {viewMatter.customNotes && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Notes</h4>
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm break-words whitespace-pre-wrap">{viewMatter.customNotes}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h4>
                  
                  <div className="grid gap-3">
                    {viewMatter.openedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Opened</span>
                        <span className="text-sm">{format(new Date(viewMatter.openedAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {viewMatter.closedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Closed</span>
                        <span className="text-sm">{format(new Date(viewMatter.closedAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created in System</span>
                      <span className="text-sm">{format(new Date(viewMatter.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="text-sm">{format(new Date(viewMatter.updatedAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    {viewMatter.lastSyncedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Synced from Docketwise</span>
                        <span className="text-sm">{format(new Date(viewMatter.lastSyncedAt), "MMM d, yyyy h:mm a")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Last Edited By Section */}
                {viewMatter.isEdited && viewMatter.editedByUser && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Last Modified By</h4>
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {viewMatter.editedByUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{viewMatter.editedByUser.name}</p>
                          <p className="text-xs text-muted-foreground">{viewMatter.editedByUser.email}</p>
                        </div>
                        {viewMatter.editedAt && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Edited on</p>
                            <p className="text-sm">{format(new Date(viewMatter.editedAt), "MMM d, yyyy")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(viewMatter.editedAt), "h:mm a")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Edit Drawer */}
      <EditMatterDrawer
        matter={editMatter}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleSuccess}
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
