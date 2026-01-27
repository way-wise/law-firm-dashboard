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
import type { TeamMemberSchemaType, DocketwisePaginationSchemaType } from "@/schema/teamSchema";
import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Eye, Pencil, Trash, User } from "lucide-react";
import { useRouter } from "@bprogress/next";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DocketwiseConnectionCard } from "@/components/docketwise-connection-card";

const getTeamMemberName = (member: TeamMemberSchemaType) => {
  if (member.first_name || member.last_name) {
    return `${member.first_name || ""} ${member.last_name || ""}`.trim();
  }
  return member.email;
};

interface TeamTableProps {
  team: {
    data: TeamMemberSchemaType[];
    pagination?: DocketwisePaginationSchemaType;
    connectionError?: boolean;
  };
}

const TeamTable = ({ team }: TeamTableProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberSchemaType | null>(null);

  const handleView = (member: TeamMemberSchemaType) => {
    setSelectedMember(member);
    setOpenViewDialog(true);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const columns: ColumnDef<TeamMemberSchemaType>[] = [
    {
      header: "Team Member",
      accessorKey: "email",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">{getTeamMemberName(row.original)}</p>
            <p className="text-sm text-muted-foreground truncate">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => row.original.role || "-",
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: ({ row }) => (
        <p className="text-sm">{row.original.phone || "-"}</p>
      ),
    },
    {
      header: "Status",
      accessorKey: "active",
      cell: ({ row }) => {
        const isActive = row.original.active !== false;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
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
            }}
            title="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
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

  if (team.connectionError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Team</h1>
          </div>
        </div>
        <DocketwiseConnectionCard 
          description="Connect your Docketwise account to view and manage team members."
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
            <h1 className="text-2xl font-semibold">Team</h1>
          </div>
{/* Note: Docketwise API doesn't support user creation */}
        </div>

        {/* Card with filters and table */}
        <div className="rounded-xl border bg-card pb-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-6">
            <Select
              value={searchParams.get("active") || "all"}
              onValueChange={(value) => handleFilterChange("active", value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            data={team.data}
            columns={columns}
            emptyMessage="No team members found"
          />

          {/* Pagination */}
          {team.pagination && (
            <DocketwisePagination pagination={team.pagination} />
          )}
        </div>
      </div>

      {/* Team member view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Team Member Details</DialogTitle>
            <DialogDescription>
              User information from Docketwise
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="flex flex-col gap-6">
              {/* Basic Info */}
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  <User className="size-6 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold">{getTeamMemberName(selectedMember)}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedMember.active !== false ? "default" : "secondary"}>
                      {selectedMember.active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="grid gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedMember.email}</p>
                </div>
                {selectedMember.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{selectedMember.phone}</p>
                  </div>
                )}
                {selectedMember.role && (
                  <div>
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="text-sm font-medium">{selectedMember.role}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(selectedMember.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-sm">{formatDate(selectedMember.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamTable;
