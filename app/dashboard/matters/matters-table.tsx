"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DocketwisePagination } from "@/components/ui/docketwise-pagination";
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
import { ArrowLeft, Eye, Pencil, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "@bprogress/next";
import { useSearchParams } from "next/navigation";
import { MatterDetailSheet } from "../_components/matter-detail-sheet";
import { DocketwiseConnectionCard } from "@/components/docketwise-connection-card";

const getClientName = (matter: MatterSchemaType) => {
  if (!matter.client) return "Unknown";
  const firstName = matter.client.first_name || "";
  const lastName = matter.client.last_name || "";
  return `${firstName} ${lastName}`.trim() || "Unknown";
};

const getStatusName = (matter: MatterSchemaType) => {
  return matter.status?.name || "No Status";
};

interface MattersTableProps {
  matters: {
    data: MatterSchemaType[];
    pagination?: {
      total: number;
      next_page: number | null;
      previous_page: number | null;
      total_pages: number;
    };
    connectionError?: boolean;
  };
}

const MattersTable = ({ matters }: MattersTableProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMatter, setSelectedMatter] = useState<MatterSchemaType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleView = (matter: MatterSchemaType) => {
    setSelectedMatter(matter);
    setSheetOpen(true);
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const columns: ColumnDef<MatterSchemaType>[] = [
    {
      header: "Matter Title",
      accessorKey: "title",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          {row.original.number && (
            <p className="text-sm text-muted-foreground">{row.original.number}</p>
          )}
        </div>
      ),
    },
    {
      header: "Client Name",
      accessorKey: "client",
      cell: ({ row }) => <p className="text-sm">{getClientName(row.original)}</p>,
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

        {/* Show connection card if there's a connection error */}
        {matters.connectionError ? (
          <DocketwiseConnectionCard 
            description="Connect your Docketwise account to view and manage matters."
          />
        ) : (
          /* Card with search and table */
          <div className="rounded-xl border bg-card pb-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-6">
            <Select 
              value={searchParams.get("archived") || "all"} 
              onValueChange={(value) => updateFilters("archived", value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Matters</SelectItem>
                <SelectItem value="false">Active</SelectItem>
                <SelectItem value="true">Archived</SelectItem>
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
            <DocketwisePagination pagination={matters.pagination} />
          )}
        </div>
        )}
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
