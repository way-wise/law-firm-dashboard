"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination } from "@/components/ui/pagination";
import type { Charge } from "@/data/charges";
import { formatCurrency, getStatusVariant, getStatusLabel } from "@/data/charges";
import { formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, DollarSign, MoreVertical, Pencil, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChargesTableProps {
  charges: {
    data: Charge[];
    meta: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

const ChargesTable = ({ charges }: ChargesTableProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleView = (charge: Charge) => {
    router.push(`/dashboard/charges/${charge.id}`);
  };

  const columns: ColumnDef<Charge>[] = [
    {
      header: "Description",
      accessorKey: "description",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.description || "No description"}</p>
          {row.original.matter_id && (
            <p className="text-sm text-muted-foreground">Matter ID: {row.original.matter_id}</p>
          )}
        </div>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: ({ row }) => (
        <p className="font-semibold text-green-600">{formatCurrency(row.original.amount)}</p>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)}>
          {getStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      header: "Invoice ID",
      accessorKey: "invoice_id",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">#{row.original.invoice_id}</p>
      ),
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {new Date(row.original.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      ),
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
        </p>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row.original)}>
              <Pencil />
              View/Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handlePageChange = (page: string) => {
    console.log("Page changed to:", page);
  };

  const handleLimitChange = (limit: string) => {
    console.log("Limit changed to:", limit);
  };

  // Filter charges based on search and status
  const filteredCharges = charges.data.filter((charge) => {
    const matchesSearch =
      !searchTerm ||
      charge.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.amount.includes(searchTerm) ||
      charge.invoice_id.toString().includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || charge.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate total
  const totalAmount = filteredCharges.reduce(
    (sum, charge) => sum + parseFloat(charge.amount),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Charges</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/charges/new">
            <Plus />
            Add Charge
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
              placeholder="Search charges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="fee">Fee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total Summary */}
        {filteredCharges.length > 0 && (
          <div className="mx-6 mb-4 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Total Amount ({filteredCharges.length} {filteredCharges.length === 1 ? "charge" : "charges"}):
                </span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Table */}
        <DataTable
          data={filteredCharges}
          columns={columns}
          emptyMessage="No charges found"
        />

        {/* Pagination */}
        <Pagination
          meta={charges.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>
    </div>
  );
};

export default ChargesTable;

