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
import type { Client } from "@/data/clients";
import { formatDateTime } from "@/lib/utils";
import { PaginatedData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useState } from "react";

const ClientsTable = ({ clients }: { clients: PaginatedData<Client> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const columns: ColumnDef<Client>[] = [
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
      header: "Phone",
      accessorKey: "phone",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      header: "Nationality",
      accessorKey: "nationality",
      cell: ({ row }) => row.original.nationality || "-",
    },
    {
      header: "Current Status",
      accessorKey: "currentStatus",
      cell: ({ row }) => (
        row.original.currentStatus ? (
          <Badge variant="secondary">{row.original.currentStatus}</Badge>
        ) : "-"
      ),
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
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
                  setSelectedClient(row.original);
                  setOpenViewDialog(true);
                }}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Edit Client</DropdownMenuItem>
              <DropdownMenuItem>View Matters</DropdownMenuItem>
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
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button
          onClick={() => setOpenAddDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 size-4" />
          Add Client
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients by name or email..."
              className="pl-10"
            />
          </div>
        </div>
        <DataTable
          data={clients.data}
          columns={columns}
          emptyMessage="No clients available"
        />
        <Pagination
          meta={clients.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Client view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>View client information</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="text-sm">{selectedClient.name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p className="text-sm">{selectedClient.email}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                <p className="text-sm">{selectedClient.phone || "-"}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Nationality</h3>
                <p className="text-sm">{selectedClient.nationality || "-"}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Current Status</h3>
                {selectedClient.currentStatus ? (
                  <Badge variant="secondary">{selectedClient.currentStatus}</Badge>
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Client dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Enter client information to create a new client record</DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input placeholder="John Doe" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input type="email" placeholder="john@example.com" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Phone</label>
                <Input placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nationality</label>
                <Input placeholder="e.g., Indian, Chinese" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Immigration Status</label>
              <Input placeholder="e.g., H-1B, F-1, B-1/B-2" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Add Client
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientsTable;
