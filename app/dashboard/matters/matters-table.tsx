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
import type { Matter } from "@/data/matters";
import { getClientName, getStatusName, getTypeName } from "@/data/matters";
import { formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreVertical, Pencil, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MatterDetailSheet } from "../_components/matter-detail-sheet";

interface MattersTableProps {
  matters: {
    data: Matter[];
    meta: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

const MattersTable = ({ matters }: MattersTableProps) => {
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleView = (matter: Matter) => {
    setSelectedMatter(matter);
    setSheetOpen(true);
  };

  const columns: ColumnDef<Matter>[] = [
    {
      header: "Client",
      accessorKey: "client",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{getClientName(row.original.client)}</p>
          <p className="text-sm text-muted-foreground">{row.original.number}</p>
        </div>
      ),
    },
    {
      header: "Matter Type",
      accessorKey: "type",
      cell: ({ row }) => (
        <p className="text-sm">{getTypeName(row.original)}</p>
      ),
    },
    {
      header: "Receipt #",
      accessorKey: "receipt_number",
      cell: ({ row }) => (
        <p className="text-sm font-mono">{row.original.receipt_number || "-"}</p>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const statusName = getStatusName(row.original).toLowerCase();
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        
        if (statusName.includes("draft") || statusName.includes("document")) {
          variant = "secondary";
        } else if (statusName.includes("rfe")) {
          variant = "destructive";
        } else if (statusName.includes("filed") || statusName.includes("approved")) {
          variant = "default";
        } else if (statusName.includes("evaluation") || statusName.includes("review")) {
          variant = "outline";
        }
        
        return <Badge variant={variant}>{getStatusName(row.original)}</Badge>;
      },
    },
    {
      header: "Last Updated",
      accessorKey: "updated_at",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updated_at), { addSuffix: true })}
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
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil />
              Edit
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

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header outside card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Matters</h3>
            <Badge>{matters.meta.total}</Badge>
          </div>
          <Button asChild>
            <Link href="/dashboard/matters/new">
              <Plus />
              New Matter
            </Link>
          </Button>
        </div>

        {/* Card with search and table */}
        <div className="rounded-xl border bg-card pb-6">
          {/* Search */}
          <div className="flex items-center justify-between gap-4 p-6">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Search matters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>

          {/* Table */}
          <DataTable
            data={matters.data}
            columns={columns}
            emptyMessage="No matters found"
          />

          {/* Pagination */}
          <Pagination
            meta={matters.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
      </div>

      <MatterDetailSheet
        matter={selectedMatter}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
};

export default MattersTable;
