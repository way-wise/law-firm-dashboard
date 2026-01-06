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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Eye, MoreVertical, Pencil, Plus, Search, Trash } from "lucide-react";
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [workflowStageFilter, setWorkflowStageFilter] = useState<string>("all");

  const handleView = (matter: Matter) => {
    setSelectedMatter(matter);
    setSheetOpen(true);
  };

  const columns: ColumnDef<Matter>[] = [
    {
      header: "Client Name",
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
      header: "Paralegal",
      accessorKey: "paralegal",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.paralegal || "-"}</p>
      ),
    },
    {
      header: "Workflow Stage",
      accessorKey: "status",
      cell: ({ row }) => {
        const statusName = getStatusName(row.original).toLowerCase();
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        
        if (statusName.includes("intake") || statusName.includes("document")) {
          variant = "secondary";
        } else if (statusName.includes("rfe") || statusName.includes("denied")) {
          variant = "destructive";
        } else if (statusName.includes("filed") || statusName.includes("approved")) {
          variant = "default";
        } else if (statusName.includes("review") || statusName.includes("drafting")) {
          variant = "outline";
        }
        
        return <Badge variant={variant}>{getStatusName(row.original)}</Badge>;
      },
    },
    {
      header: "Billing Status",
      accessorKey: "billing_status",
      cell: ({ row }) => (
        <Badge variant={row.original.billing_status === "paid" ? "success" : "secondary"}>
          {row.original.billing_status || "Pending"}
        </Badge>
      ),
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
                placeholder="Search matters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Matter Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="h1b">H-1B</SelectItem>
                <SelectItem value="greencard">Green Card</SelectItem>
                <SelectItem value="asylum">Asylum</SelectItem>
                <SelectItem value="naturalization">Naturalization</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workflowStageFilter} onValueChange={setWorkflowStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Workflow Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="document_collection">Document Collection</SelectItem>
                <SelectItem value="drafting">Drafting</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rfe">RFE</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
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
