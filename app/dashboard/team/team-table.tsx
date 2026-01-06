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
import type { Worker } from "@/data/workers";
import { PaginatedData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useState } from "react";

const TeamTable = ({ workers }: { workers: PaginatedData<Worker> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const columns: ColumnDef<Worker>[] = [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => row.original.title || "-",
    },
    {
      header: "Team Type",
      accessorKey: "teamType",
      cell: ({ row }) => (
        <Badge variant={row.original.teamType === "inHouse" ? "default" : "secondary"}>
          {row.original.teamType === "inHouse" ? "In-House" : "Contractor"}
        </Badge>
      ),
    },
    {
      header: "Active Cases",
      accessorKey: "activeCases",
    },
    {
      header: "Total Handled",
      accessorKey: "totalCasesHandled",
    },
    {
      header: "Satisfaction",
      accessorKey: "clientSatisfaction",
      cell: ({ row }) => `${row.original.clientSatisfaction}/5`,
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
                  setSelectedWorker(row.original);
                  setOpenViewDialog(true);
                }}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Edit Member</DropdownMenuItem>
              <DropdownMenuItem>View Assigned Cases</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Deactivate</DropdownMenuItem>
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
        <h1 className="text-2xl font-semibold">Team</h1>
        <Button
          onClick={() => setOpenAddDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 size-4" />
          Add Team Member
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search team members..."
              className="pl-10"
            />
          </div>
        </div>
        <DataTable
          data={workers.data}
          columns={columns}
          emptyMessage="No team members available"
        />
        <Pagination
          meta={workers.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Worker view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Member Details</DialogTitle>
            <DialogDescription>View team member information and KPIs</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="text-sm">{selectedWorker.name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p className="text-sm">{selectedWorker.email}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
                <p className="text-sm">{selectedWorker.title || "-"}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Team Type</h3>
                <Badge variant={selectedWorker.teamType === "inHouse" ? "default" : "secondary"}>
                  {selectedWorker.teamType === "inHouse" ? "In-House" : "Contractor"}
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Specializations</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedWorker.specializations.map((spec) => (
                    <Badge key={spec} variant="outline">{spec}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.activeCases}</p>
                  <p className="text-xs text-muted-foreground">Active Cases</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.totalCasesHandled}</p>
                  <p className="text-xs text-muted-foreground">Total Handled</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.avgResolutionDays}d</p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.clientSatisfaction}/5</p>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Team Member dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a new paralegal or contractor to your team</DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input placeholder="Jane Smith" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input type="email" placeholder="jane@lawfirm.com" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Title</label>
                <Input placeholder="Senior Paralegal" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Team Type <span className="text-destructive">*</span>
                </label>
                <Select defaultValue="inHouse">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inHouse">In-House</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Specializations</label>
              <Input placeholder="e.g., H-1B, Green Card, Asylum (comma separated)" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Add Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamTable;
