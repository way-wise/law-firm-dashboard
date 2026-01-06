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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Worker } from "@/data/workers";
import { PaginatedData } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Eye, MoreVertical, Pencil, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  title: z.string().optional(),
  teamType: z.enum(["inHouse", "contractor"]),
  specializations: z.string().optional(),
});

type TeamMemberInput = z.infer<typeof teamMemberSchema>;

const TeamTable = ({ workers }: { workers: PaginatedData<Worker> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const form = useForm<TeamMemberInput>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      title: "",
      teamType: "inHouse",
      specializations: "",
    },
  });

  const onSubmit = async (data: TeamMemberInput) => {
    console.log("New team member:", data);
    // TODO: API call
    setOpenAddDialog(false);
    form.reset();
  };

  const columns: ColumnDef<Worker>[] = [
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
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => row.original.title || "-",
    },
    {
      header: "Team Type",
      accessorKey: "teamType",
      cell: ({ row }) => (
        <Badge variant={row.original.teamType === "inHouse" ? "default" : "secondary"}>
          {row.original.teamType === "inHouse" ? "In-House" : "Contractor"}
        </Badge>
      ),
    },
    {
      header: "Active Cases",
      accessorKey: "activeCases",
    },
    {
      header: "Total Handled",
      accessorKey: "totalCasesHandled",
    },
    {
      header: "Satisfaction",
      accessorKey: "clientSatisfaction",
      cell: ({ row }) => `${row.original.clientSatisfaction}/5`,
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
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
            <DropdownMenuItem
              onClick={() => {
                setSelectedWorker(row.original);
                setOpenViewDialog(true);
              }}
            >
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash />
              Deactivate
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
            <h1 className="text-2xl font-semibold">Team</h1>
          </div>
          <Button onClick={() => setOpenAddDialog(true)}>
            <Plus />
            Add Team Member
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
                placeholder="Search team members..."
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
                <SelectItem value="inHouse">In-House</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            data={workers.data}
            columns={columns}
            emptyMessage="No team members available"
          />

          {/* Pagination */}
          <Pagination
            meta={workers.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
      </div>

      {/* Worker view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Member Details</DialogTitle>
            <DialogDescription>View team member information and KPIs</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="text-sm">{selectedWorker.name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p className="text-sm">{selectedWorker.email}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
                <p className="text-sm">{selectedWorker.title || "-"}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Team Type</h3>
                <Badge variant={selectedWorker.teamType === "inHouse" ? "default" : "secondary"}>
                  {selectedWorker.teamType === "inHouse" ? "In-House" : "Contractor"}
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Specializations</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedWorker.specializations.map((spec) => (
                    <Badge key={spec} variant="outline">{spec}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.activeCases}</p>
                  <p className="text-xs text-muted-foreground">Active Cases</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.totalCasesHandled}</p>
                  <p className="text-xs text-muted-foreground">Total Handled</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.avgResolutionDays}d</p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedWorker.clientSatisfaction}/5</p>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Team Member dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a new paralegal or contractor to your team</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
            <FieldSet disabled={form.formState.isSubmitting}>
              <FieldGroup>
                <FieldGroup className="grid sm:grid-cols-2">
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="name">
                          Full Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="name" placeholder="Jane Smith" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="email">
                          Email <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="email" type="email" placeholder="jane@lawfirm.com" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <FieldGroup className="grid sm:grid-cols-2">
                  <Controller
                    name="title"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="title">Title</FieldLabel>
                        <Input {...field} id="title" placeholder="Senior Paralegal" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    name="teamType"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="teamType">
                          Team Type <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inHouse">In-House</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <Controller
                  name="specializations"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="specializations">Specializations</FieldLabel>
                      <Input {...field} id="specializations" placeholder="e.g., H-1B, Green Card, Asylum (comma separated)" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={form.formState.isSubmitting}>
                  Add Member
                </Button>
              </div>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamTable;
