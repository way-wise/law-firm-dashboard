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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowStage } from "@/data/workflow-stages";
import { PaginatedData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useState } from "react";

const WorkflowStagesTable = ({ stages }: { stages: PaginatedData<WorkflowStage> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);

  const columns: ColumnDef<WorkflowStage>[] = [
    {
      header: "Order",
      accessorKey: "order",
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: row.original.color }}
          />
          <span>{row.original.name}</span>
        </div>
      ),
    },
    {
      header: "Code",
      accessorKey: "code",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.code}</Badge>
      ),
    },
    {
      header: "Terminal",
      accessorKey: "isTerminal",
      cell: ({ row }) => (
        <Badge variant={row.original.isTerminal ? "warning" : "secondary"}>
          {row.original.isTerminal ? "Yes" : "No"}
        </Badge>
      ),
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
                  setSelectedStage(row.original);
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
        <h1 className="text-2xl font-semibold">Workflow Stages</h1>
        <Button
          onClick={() => setOpenAddDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 size-4" />
          Add Stage
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search stages..."
              className="pl-10"
            />
          </div>
        </div>
        <DataTable
          data={stages.data}
          columns={columns}
          emptyMessage="No workflow stages available"
        />
        <Pagination
          meta={stages.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Stage view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow Stage Details</DialogTitle>
            <DialogDescription>View workflow stage information</DialogDescription>
          </DialogHeader>
          {selectedStage && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <div className="flex items-center gap-2">
                  <div
                    className="size-4 rounded-full"
                    style={{ backgroundColor: selectedStage.color }}
                  />
                  <p className="text-sm">{selectedStage.name}</p>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
                <Badge variant="outline">{selectedStage.code}</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Order</h3>
                <p className="text-sm">{selectedStage.order}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Icon</h3>
                <p className="text-sm">{selectedStage.icon}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Terminal Stage</h3>
                <Badge variant={selectedStage.isTerminal ? "warning" : "secondary"}>
                  {selectedStage.isTerminal ? "Yes (Final)" : "No"}
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <Badge variant={selectedStage.isActive ? "success" : "secondary"}>
                  {selectedStage.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Workflow Stage dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Workflow Stage</DialogTitle>
            <DialogDescription>Create a new workflow stage for case tracking</DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input placeholder="e.g., Document Review" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Code <span className="text-destructive">*</span>
                </label>
                <Input placeholder="e.g., DOC_REVIEW" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Order <span className="text-destructive">*</span>
                </label>
                <Input type="number" placeholder="1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Color</label>
                <Input type="color" defaultValue="#3b82f6" className="h-10" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Terminal Stage</label>
                <Select defaultValue="no">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes (Final Stage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Add Stage
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkflowStagesTable;
