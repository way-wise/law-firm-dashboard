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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination } from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import type { Client } from "@/data/clients";
import { getContactName, getPrimaryPhone, formatAddress } from "@/data/clients";
import { PaginatedData } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Eye, Pencil, Plus, Search, Trash, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ContactsTable = ({ clients }: { clients: PaginatedData<Client> }) => {
  const router = useRouter();
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setOpenViewDialog(true);
  };

  const columns: ColumnDef<Client>[] = [
    {
      header: "Contact",
      accessorKey: "first_name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            {row.original.type === "Institution" ? (
              <Building2 className="size-4 text-muted-foreground" />
            ) : (
              <User className="size-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{getContactName(row.original)}</p>
            <p className="text-sm text-muted-foreground">{row.original.email || "-"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "Institution" ? "secondary" : "outline"}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone_numbers",
      cell: ({ row }) => (
        <p className="text-sm">{getPrimaryPhone(row.original) || "-"}</p>
      ),
    },
    {
      header: "Location",
      accessorKey: "physical_address",
      cell: ({ row }) => {
        const addr = row.original.physical_address;
        if (!addr) return <p className="text-sm text-muted-foreground">-</p>;
        return (
          <p className="text-sm">
            {[addr.city, addr.state || addr.province].filter(Boolean).join(", ") || "-"}
          </p>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "lead",
      cell: ({ row }) => (
        row.original.lead ? (
          <Badge variant="default">Lead</Badge>
        ) : (
          <Badge variant="secondary">Client</Badge>
        )
      ),
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), "MMM d, yyyy")}
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
            onClick={() => {
              // TODO: Implement edit
              console.log("Edit contact:", row.original.id);
            }}
            title="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // TODO: Implement delete
              console.log("Delete contact:", row.original.id);
            }}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash className="size-4" />
          </Button>
        </div>
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
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Contacts</h1>
          </div>
          <Button asChild>
            <Link href="/dashboard/contacts/new">
              <Plus />
              Add Contact
            </Link>
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
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Person">Person</SelectItem>
                <SelectItem value="Institution">Institution</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            data={clients.data}
            columns={columns}
            emptyMessage="No contacts found"
          />

          {/* Pagination */}
          <Pagination
            meta={clients.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
      </div>

      {/* Contact view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              {selectedClient?.type === "Institution" ? "Organization" : "Individual"} contact information
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="flex flex-col gap-6">
              {/* Basic Info */}
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  {selectedClient.type === "Institution" ? (
                    <Building2 className="size-6 text-muted-foreground" />
                  ) : (
                    <User className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold">{getContactName(selectedClient)}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedClient.type === "Institution" ? "secondary" : "outline"}>
                      {selectedClient.type}
                    </Badge>
                    {selectedClient.lead && <Badge>Lead</Badge>}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="grid gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedClient.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{getPrimaryPhone(selectedClient) || "-"}</p>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <p className="text-xs text-muted-foreground">Physical Address</p>
                <p className="text-sm">{formatAddress(selectedClient.physical_address) || "-"}</p>
              </div>

              {/* Country of Origin */}
              {selectedClient.physical_address?.country && (
                <div>
                  <p className="text-xs text-muted-foreground">Country of Origin</p>
                  <p className="text-sm font-medium">{selectedClient.physical_address.country}</p>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{format(new Date(selectedClient.created_at), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-sm">{format(new Date(selectedClient.updated_at), "MMM d, yyyy")}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default ContactsTable;
