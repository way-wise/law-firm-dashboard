"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import type { MatterType } from "@/data/matter-types";
import { PaginatedData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useState } from "react";

const MatterTypesTable = ({ matterTypes }: { matterTypes: PaginatedData<MatterType> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedMatterType, setSelectedMatterType] = useState<MatterType | null>(null);

  const columns: ColumnDef<MatterType>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.code}</Badge>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
    },
    {
      header: "Est. Days",
      accessorKey: "estimatedDays",
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Action",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedMatterType(row.original);
                  setOpenViewDialog(true);
                }}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
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
        <h1 className="text-2xl font-semibold">Matter Types</h1>
        <Button
          onClick={() => setOpenAddDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 size-4" />
          Add Matter Type
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search matter types..."
              className="pl-10"
            />
          </div>
        </div>
        <DataTable
          data={matterTypes.data}
          columns={columns}
          emptyMessage="No matter types available"
        />
        <Pagination
          meta={matterTypes.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Matter Type view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Matter Type Details</DialogTitle>
            <DialogDescription>View matter type information</DialogDescription>
          </DialogHeader>
          {selectedMatterType && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="text-sm">{selectedMatterType.name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
                <Badge variant="outline">{selectedMatterType.code}</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                <p className="text-sm">{selectedMatterType.category}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Estimated Days</h3>
                <p className="text-sm">{selectedMatterType.estimatedDays} days</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <Badge variant={selectedMatterType.isActive ? "success" : "secondary"}>
                  {selectedMatterType.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Matter Type dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Matter Type</DialogTitle>
            <DialogDescription>Create a new immigration matter type</DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input placeholder="e.g., H-1B Petition" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Code <span className="text-destructive">*</span>
                </label>
                <Input placeholder="e.g., H1B" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Est. Days
                </label>
                <Input type="number" placeholder="90" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              <Input placeholder="e.g., Work Visa" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Add Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatterTypesTable;
