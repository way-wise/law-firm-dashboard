"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { safeClient } from "@/lib/orpc/client";
import { formatDateTime } from "@/lib/utils";
import {
  todoInputSchema,
  TodoInputSchemaType,
  TodoSchemaType,
} from "@/schema/todoSchema";
import { PaginatedData } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  LuEllipsisVertical,
  LuEye,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash,
} from "react-icons/lu";
import { toast } from "sonner";

const TodosTable = ({ todos }: { todos: PaginatedData<TodoSchemaType> }) => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<TodoSchemaType | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  // Todo creation form
  const createForm = useForm({
    resolver: zodResolver(todoInputSchema),
    defaultValues: {
      title: "",
      description: "",
      dueTime: "",
    },
  });

  // Todo edit form
  const editForm = useForm({
    resolver: zodResolver(todoInputSchema),
    defaultValues: {
      title: selectedTodo?.title || "",
      status: selectedTodo?.status ?? "pending",
      dueTime: selectedTodo?.dueTime?.toISOString() || "",
      description: selectedTodo?.description || "",
    },
  });

  // Handle Form Submit
  const onSubmit = async (data: TodoInputSchemaType) => {
    const [error] = await safeClient.todos.create(data);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Todo created");
    setOpenCreateDialog(false);
    router.refresh();
    createForm.reset();
  };

  // Handle Edit
  const handleEdit = (todo: TodoSchemaType) => {
    setSelectedTodo(todo);
    editForm.reset({
      title: todo.title,
      status: todo.status,
      dueTime: todo.dueTime
        ? new Date(todo.dueTime).toISOString().slice(0, 16)
        : "",
      description: todo.description || "",
    });
    setOpenEditDialog(true);
  };

  // Handle Edit Submit
  const onEditSubmit = async (data: TodoInputSchemaType) => {
    if (!selectedTodo?.id) {
      toast.error("Todo id is required");
      return;
    }

    const [error] = await safeClient.todos.update({
      ...data,
      id: selectedTodo.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Todo updated");
    setOpenEditDialog(false);
    router.refresh();
    editForm.reset();
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!id) {
      toast.error("Todo id is required");
      return;
    }

    const [error] = await safeClient.todos.delete({ id });
    if (error) {
      toast.error(error.message);
      return;
    }

    // If this was the last item on current page and we're not on page 1, go to previous page
    const { page } = todos.meta;
    const isLastItemOnPage = todos.data.length === 1;
    const shouldGoBack = isLastItemOnPage && page > 1;

    toast.success("Todo deleted");

    if (shouldGoBack) {
      params.set("page", String(page - 1));
      router.push(`?${params}`, { scroll: false });
    } else {
      setOpenDeleteDialog(false);
      router.refresh();
    }
  };

  // Handle Page Change
  const handlePageChange = (page: string) => {
    params.set("page", page);
    router.push(`?${params}`, { scroll: false });
  };

  // Handle Limit Change
  const handleLimitChange = (limit: string) => {
    params.set("limit", limit);
    router.push(`?${params}`, { scroll: false });
  };

  // Table Columns
  const columns: ColumnDef<TodoSchemaType>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    },
    {
      header: "Title",
      accessorKey: "title",
    },

    {
      header: "Due Date",
      accessorKey: "dueTime",
      cell: ({ row }) => {
        const dueTime = row.original.dueTime;
        return dueTime ? formatDateTime(dueTime) : null;
      },
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      header: "Updated At",
      accessorKey: "updatedAt",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
    {
      header: "Action",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <LuEllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTodo(row.original);
                  setOpenViewDialog(true);
                }}
              >
                <LuEye />
                <span>View</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <LuPencil />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setSelectedTodo(row.original);
                  setOpenDeleteDialog(true);
                }}
              >
                <LuTrash />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium">Todos</h1>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <LuPlus />
          <span>Add Todo</span>
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <InputGroup className="max-w-xs">
            <InputGroupAddon>
              <LuSearch />
            </InputGroupAddon>
            <InputGroupInput type="search" placeholder="Search..." />
          </InputGroup>
        </div>
        <DataTable
          data={todos.data}
          columns={columns}
          emptyMessage="No todos available"
        />
        <Pagination
          meta={todos.meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Todo view dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Todo View</DialogTitle>
            <DialogDescription>View todo details</DialogDescription>
          </DialogHeader>
          {selectedTodo && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Title
                </h3>
                <p className="text-sm">{selectedTodo.title}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Status
                </h3>
                <Badge
                  variant={
                    selectedTodo.status === "pending" ? "warning" : "success"
                  }
                >
                  {selectedTodo.status}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Due Time
                </h3>
                <p className="text-sm">
                  {selectedTodo.dueTime
                    ? formatDateTime(selectedTodo.dueTime)
                    : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm">
                  {selectedTodo.description ? selectedTodo.description : "-"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Todo creation dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Todo</DialogTitle>
            <DialogDescription>
              Fill the form to add a new todo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onSubmit)} autoComplete="off">
            <FieldSet disabled={createForm.formState.isSubmitting}>
              <FieldGroup>
                <Controller
                  name="title"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="title">
                        Title
                        <span className="text-destructive-foreground">*</span>
                      </FieldLabel>
                      <Input {...field} id="title" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="dueTime"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="dueTime">Due Time</FieldLabel>
                      <Input {...field} id="dueTime" type="datetime-local" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="description"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea {...field} id="description" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => setOpenCreateDialog(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createForm.formState.isSubmitting}
                >
                  Add Todo
                </Button>
              </div>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>

      {/* Todo edit dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
            <DialogDescription>Update the todo details</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(onEditSubmit)}
            autoComplete="off"
          >
            <FieldSet disabled={editForm.formState.isSubmitting}>
              <FieldGroup>
                <Controller
                  name="title"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="title">
                        Title
                        <span className="text-destructive-foreground">*</span>
                      </FieldLabel>
                      <Input {...field} id="title" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="dueTime"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="dueTime">Due Time</FieldLabel>
                      <Input {...field} id="dueTime" type="datetime-local" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="description"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea {...field} id="description" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => setOpenCreateDialog(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={editForm.formState.isSubmitting}
                >
                  Update Todo
                </Button>
              </div>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Todo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this todo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              onClick={() => selectedTodo && handleDelete(selectedTodo.id)}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TodosTable;
