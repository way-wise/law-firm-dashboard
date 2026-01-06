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
import type { MatterType } from "@/data/matter-types";
import { PaginatedData } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Eye, MoreVertical, Pencil, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const matterTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  category: z.enum(["Employment", "Family", "Humanitarian", "Citizenship"]),
  estimatedDays: z.string().optional(),
});

type MatterTypeInput = z.infer<typeof matterTypeSchema>;

const MatterTypesTable = ({ matterTypes }: { matterTypes: PaginatedData<MatterType> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedMatterType, setSelectedMatterType] = useState<MatterType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const form = useForm<MatterTypeInput>({
    resolver: zodResolver(matterTypeSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "Employment",
      estimatedDays: "",
    },
  });

  const onSubmit = async (data: MatterTypeInput) => {
    console.log("New matter type:", data);
    // TODO: API call
    setOpenAddDialog(false);
    form.reset();
  };

  const columns: ColumnDef<MatterType>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.code}</Badge>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
    },
    {
      header: "Est. Days",
      accessorKey: "estimatedDays",
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
                setSelectedMatterType(row.original);
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
            <h1 className="text-2xl font-semibold">Matter Types</h1>
          </div>
          <Button onClick={() => setOpenAddDialog(true)}>
            <Plus />
            Add Matter Type
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
                placeholder="Search matter types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Employment">Employment</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Humanitarian">Humanitarian</SelectItem>
                <SelectItem value="Citizenship">Citizenship</SelectItem>
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
            data={matterTypes.data}
            columns={columns}
            emptyMessage="No matter types available"
          />

          {/* Pagination */}
          <Pagination
            meta={matterTypes.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
      </div>

      {/* Matter Type view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Matter Type Details</DialogTitle>
            <DialogDescription>View matter type information</DialogDescription>
          </DialogHeader>
          {selectedMatterType && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="text-sm">{selectedMatterType.name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
                <Badge variant="outline">{selectedMatterType.code}</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                <p className="text-sm">{selectedMatterType.category}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Estimated Days</h3>
                <p className="text-sm">{selectedMatterType.estimatedDays} days</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <Badge variant={selectedMatterType.isActive ? "success" : "secondary"}>
                  {selectedMatterType.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Matter Type dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Matter Type</DialogTitle>
            <DialogDescription>Create a new immigration matter type</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
            <FieldSet disabled={form.formState.isSubmitting}>
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="name">
                        Name <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input {...field} id="name" placeholder="e.g., H-1B Petition" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <FieldGroup className="grid sm:grid-cols-2">
                  <Controller
                    name="code"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="code">
                          Code <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="code" placeholder="e.g., H1B" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    name="estimatedDays"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="estimatedDays">Est. Days</FieldLabel>
                        <Input {...field} id="estimatedDays" type="number" placeholder="90" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <Controller
                  name="category"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="category">
                        Category <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employment">Employment</SelectItem>
                          <SelectItem value="Family">Family</SelectItem>
                          <SelectItem value="Humanitarian">Humanitarian</SelectItem>
                          <SelectItem value="Citizenship">Citizenship</SelectItem>
                        </SelectContent>
                      </Select>
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
                  Add Type
                </Button>
              </div>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatterTypesTable;
