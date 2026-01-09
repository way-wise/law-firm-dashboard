"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination } from "@/components/ui/pagination";
import type { MatterSchemaType } from "@/router/matters";
import { formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Eye, Pencil, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MatterDetailSheet } from "../_components/matter-detail-sheet";

// Helper functions for matter data
const getClientName = (client?: { first_name: string; last_name: string }) => {
  if (!client) return "Unknown";
  return `${client.first_name} ${client.last_name}`.trim();
};

const getStatusName = (matter: MatterSchemaType) => 
  matter.status?.name || "No Status";

const getTypeName = (matter: MatterSchemaType) => 
  matter.type?.name || "No Type";

interface MattersTableProps {
  matters: {
    data: MatterSchemaType[];
    pagination?: {
      total: number;
      next_page: number | null;
      previous_page: number | null;
      total_pages: number;
    };
  };
}

const MattersTable = ({ matters }: MattersTableProps) => {
  const [selectedMatter, setSelectedMatter] = useState<MatterSchemaType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [workflowStageFilter, setWorkflowStageFilter] = useState<string>("all");

  const handleView = (matter: MatterSchemaType) => {
    setSelectedMatter(matter);
    setSheetOpen(true);
  };

  const columns: ColumnDef<MatterSchemaType>[] = [
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
      header: "Receipt Number",
      accessorKey: "receipt_number",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.receipt_number || "-"}</p>
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
      header: "Priority Date",
      accessorKey: "priority_date",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.priority_date || "-"}</p>
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
              console.log("Edit matter:", row.original.id);
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
              console.log("Delete matter:", row.original.id);
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
          {matters.pagination && (
            <Pagination
              meta={{
                page: 1,
                limit: 200,
                total: matters.pagination.total,
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          )}
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
