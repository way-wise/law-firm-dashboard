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
import type { Document } from "@/data/documents";
import { formatFileSize, getFileExtension } from "@/data/documents";
import { formatDistanceToNow } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, Eye, FileText, MoreVertical, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DocumentsTableProps {
  documents: {
    data: Document[];
    meta: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

const DocumentsTable = ({ documents }: DocumentsTableProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<string>("active");

  const handleView = (document: Document) => {
    router.push(`/dashboard/documents/${document.id}`);
  };

  const handleDownload = (document: Document) => {
    // TODO: Implement download functionality
    // This would call GET /documents/:id/download to get temporary URL
    window.open(document.doc_url, "_blank");
  };

  const columns: ColumnDef<Document>[] = [
    {
      header: "Document",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{row.original.title}</p>
            {row.original.filename && (
              <p className="text-sm text-muted-foreground">
                {row.original.filename}
                {row.original.filename && (
                  <span className="ml-1 text-xs">
                    ({getFileExtension(row.original.filename)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Size",
      accessorKey: "size",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">{formatFileSize(row.original.size)}</p>
      ),
    },
    {
      header: "Uploaded By",
      accessorKey: "uploaded_by_email",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.uploaded_by_email || "Unknown"}</p>
      ),
    },
    {
      header: "Status",
      accessorKey: "archived",
      cell: ({ row }) => (
        <Badge variant={row.original.archived ? "secondary" : "default"}>
          {row.original.archived ? "Archived" : "Active"}
        </Badge>
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
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload(row.original)}>
              <Download />
              Download
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

  // Filter documents based on search and archived status
  const filteredDocuments = documents.data.filter((doc) => {
    const matchesSearch = !searchTerm || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArchived = archivedFilter === "all" || 
      (archivedFilter === "active" && !doc.archived) ||
      (archivedFilter === "archived" && doc.archived);

    return matchesSearch && matchesArchived;
  });

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
          <h1 className="text-2xl font-semibold">Documents</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/documents/new">
            <Plus />
            Upload Document
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
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Select value={archivedFilter} onValueChange={setArchivedFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <DataTable
          data={filteredDocuments}
          columns={columns}
          emptyMessage="No documents found"
        />

        {/* Pagination */}
        <Pagination
          meta={documents.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>
    </div>
  );
};

export default DocumentsTable;

