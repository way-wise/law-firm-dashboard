"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, RefreshCw, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/orpc/client";

interface MatterType {
  id: string;
  docketwiseId: number;
  name: string;
  estimatedDays: number | null;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  isEdited: boolean;
  editedAt: Date | null;
  lastSyncedAt: Date;
  matterStatuses: {
    id: string;
    docketwiseId: number;
    name: string;
    duration: number | null;
    sort: number | null;
  }[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface MatterTypesTableProps {
  matterTypes: MatterType[];
  categories: Category[];
}

const MatterTypesTable = ({ matterTypes, categories }: MatterTypesTableProps) => {
  const queryClient = useQueryClient();
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editingType, setEditingType] = useState<MatterType | null>(null);
  const [selectedMatterType, setSelectedMatterType] = useState<MatterType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Debounced search
  const debouncedSearch = useDebounceCallback((value: string) => {
    setSearchTerm(value);
  }, 300);

  const [formData, setFormData] = useState({
    estimatedDays: "",
    categoryId: "",
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => client.matterTypes.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matterTypes"] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; estimatedDays?: number; categoryId?: string }) =>
      client.matterTypes.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matterTypes"] });
      setEditingType(null);
    },
  });

  const handleEdit = (matterType: MatterType) => {
    setEditingType(matterType);
    setFormData({
      estimatedDays: matterType.estimatedDays?.toString() || "",
      categoryId: matterType.categoryId || "",
    });
  };

  const handleUpdate = () => {
    if (!editingType) return;
    updateMutation.mutate({
      id: editingType.id,
      estimatedDays: formData.estimatedDays ? parseInt(formData.estimatedDays) : undefined,
      categoryId: formData.categoryId || undefined,
    });
  };

  const columns: ColumnDef<MatterType>[] = [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">ID: {row.original.docketwiseId}</p>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: ({ row }) => (
        row.original.category ? (
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: row.original.category.color || "#6B7280" }}
            />
            <span>{row.original.category.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
    },
    {
      header: "Est. Days",
      accessorKey: "estimatedDays",
      cell: ({ row }) => (
        <span>{row.original.estimatedDays ?? "—"}</span>
      ),
    },
    {
      header: "Statuses",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.matterStatuses.length} stages</Badge>
      ),
    },
    {
      header: "Edited",
      accessorKey: "isEdited",
      cell: ({ row }) => (
        <Badge variant={row.original.isEdited ? "default" : "outline"}>
          {row.original.isEdited ? "Custom" : "Synced"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedMatterType(row.original);
              setOpenViewDialog(true);
            }}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter data
  const filteredData = matterTypes.filter((mt) => {
    const matchesSearch = mt.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || mt.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Matter Types</h1>
            <p className="text-muted-foreground">
              Immigration matter types synced from Docketwise
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Sync from Docketwise
          </Button>
        </div>

        {/* Card with search and table */}
        <div className="rounded-xl border bg-card pb-6">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-4 p-6">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Search matter types..."
                value={searchTerm}
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </InputGroup>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            data={filteredData}
            columns={columns}
            emptyMessage="No matter types available. Click 'Sync from Docketwise' to import."
          />
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Matter Type Details</DialogTitle>
            <DialogDescription>View matter type information and workflow stages</DialogDescription>
          </DialogHeader>
          {selectedMatterType && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedMatterType.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Docketwise ID</p>
                  <p className="font-medium">{selectedMatterType.docketwiseId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedMatterType.category?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Days</p>
                  <p className="font-medium">{selectedMatterType.estimatedDays ?? "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Workflow Stages</p>
                <div className="space-y-1">
                  {selectedMatterType.matterStatuses
                    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
                    .map((status, idx) => (
                      <div key={status.id} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span>{status.name}</span>
                        {status.duration && (
                          <Badge variant="outline" className="ml-auto">
                            {status.duration} days
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Matter Type</DialogTitle>
            <DialogDescription>
              Update custom fields for {editingType?.name}. These changes won&apos;t be overwritten by Docketwise sync.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedDays">Estimated Days</Label>
              <Input
                id="estimatedDays"
                type="number"
                placeholder="e.g., 90"
                value={formData.estimatedDays}
                onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: cat.color || "#6B7280" }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingType(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatterTypesTable;
