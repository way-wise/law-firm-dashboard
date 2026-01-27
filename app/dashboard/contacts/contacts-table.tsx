"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DocketwisePagination } from "@/components/ui/docketwise-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { ContactSchemaType, AddressSchemaType, DocketwisePaginationSchemaType } from "@/schema/contactSchema";
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
import { useRouter } from "@bprogress/next";
import { useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { DocketwiseConnectionCard } from "@/components/docketwise-connection-card";

const getContactName = (contact: ContactSchemaType) => {
  if (contact.company_name) return contact.company_name;
  return `${contact.first_name} ${contact.last_name}`.trim() || "Unknown";
};

const getPrimaryPhone = (contact: ContactSchemaType) => {
  const phoneNumbers = contact.phone_numbers;
  if (!phoneNumbers || phoneNumbers.length === 0) return null;
  const primary = phoneNumbers.find((p) => p.daytime) || phoneNumbers[0];
  return primary?.number || null;
};

const formatAddress = (address: AddressSchemaType | undefined) => {
  if (!address) return null;
  const parts = [
    address.street_number_and_name,
    address.apartment_number,
    address.city,
    address.state || address.province,
    address.zip_code,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
};

interface ContactsTableProps {
  contacts: {
    data: ContactSchemaType[];
    pagination?: DocketwisePaginationSchemaType;
    connectionError?: boolean;
  };
}

const ContactsTable = ({ contacts }: ContactsTableProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactSchemaType | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  const handleView = (contact: ContactSchemaType) => {
    setSelectedContact(contact);
    setOpenViewDialog(true);
  };

  const handleFilterChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  // Debounced search callback
  const debouncedSearch = useDebounceCallback(
    (value: string) => {
      handleFilterChange("search", value);
    },
    300
  );

  
  const columns: ColumnDef<ContactSchemaType>[] = [
    {
      header: "Contact",
      accessorKey: "first_name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            {row.original.type === "Institution" ? (
              <Building2 className="size-4 text-muted-foreground" />
            ) : (
              <User className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{getContactName(row.original)}</p>
            {row.original.email && (
              <p className="text-sm text-muted-foreground truncate">{row.original.email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => {
        const type = row.original.type || "Person";
        return (
          <Badge variant={type === "Institution" ? "secondary" : "outline"}>
            {type}
          </Badge>
        );
      },
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
        const location = [addr.city, addr.state || addr.province].filter(Boolean).join(", ");
        return (
          <p className="text-sm">{location || "-"}</p>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "lead",
      cell: ({ row }) => {
        const isLead = row.original.lead || false;
        return isLead ? (
          <Badge variant="default">Lead</Badge>
        ) : (
          <Badge variant="secondary">Client</Badge>
        );
      },
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

  if (contacts.connectionError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Contacts</h1>
          </div>
        </div>
        <DocketwiseConnectionCard 
          description="Connect your Docketwise account to view and manage contacts."
        />
      </div>
    );
  }

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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                type="search"
                placeholder="Search contacts..."
                value={searchValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchValue(value);
                  debouncedSearch(value);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={searchParams.get("type") || "all"}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Person">Person</SelectItem>
                <SelectItem value="Institution">Institution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            data={contacts.data}
            columns={columns}
            emptyMessage="No contacts found"
          />

          {/* Pagination */}
          {contacts.pagination && (
            <DocketwisePagination pagination={contacts.pagination} />
          )}
        </div>
      </div>

      {/* Contact view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              {selectedContact?.type === "Institution" ? "Organization" : "Individual"} contact information
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="flex flex-col gap-6">
              {/* Basic Info */}
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  {selectedContact.type === "Institution" ? (
                    <Building2 className="size-6 text-muted-foreground" />
                  ) : (
                    <User className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold">{getContactName(selectedContact)}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedContact.type === "Institution" ? "secondary" : "outline"}>
                      {selectedContact.type || "Person"}
                    </Badge>
                    {selectedContact.lead && <Badge>Lead</Badge>}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="grid gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedContact.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{getPrimaryPhone(selectedContact) || "-"}</p>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <p className="text-xs text-muted-foreground">Physical Address</p>
                <p className="text-sm">{formatAddress(selectedContact.physical_address) || "-"}</p>
              </div>

              {/* Country of Origin */}
              {selectedContact.physical_address?.country && (
                <div>
                  <p className="text-xs text-muted-foreground">Country of Origin</p>
                  <p className="text-sm font-medium">{selectedContact.physical_address.country}</p>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{format(new Date(selectedContact.created_at), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-sm">{format(new Date(selectedContact.updated_at), "MMM d, yyyy")}</p>
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
