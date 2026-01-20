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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  LuCheck,
  LuCrown,
  LuEllipsisVertical,
  LuPlus,
  LuShield,
  LuTrash,
  LuUser,
} from "react-icons/lu";
import { toast } from "sonner";
import { z } from "zod";

// User type from Better-Auth
interface UserType {
  id: string;
  name: string;
  email: string;
  role?: string;
  emailVerified: boolean;
  banned?: boolean | null;
  createdAt: Date;
}

// Props for the table component
interface UsersTableProps {
  users: UserType[];
}

// Form schema for creating user (no super option - only one super admin allowed)
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

// Role type (excludes super - cannot be assigned via UI)
type RoleType = "user" | "admin";

const UsersTable = ({ users }: UsersTableProps) => {
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Filter out super admin users - they should not be visible in the table
  const filteredUsers = users.filter((user) => user.role !== "super");
  const filteredTotal = filteredUsers.length;

  // Create user form
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  // Handle create user
  const handleCreateUser = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    try {
      const result = await authClient.admin.createUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to create user");
        return;
      }

      toast.success("User created successfully");
      setOpenCreateDialog(false);
      createForm.reset();
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const result = await authClient.admin.removeUser({
        userId: selectedUser.id,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully");
      setOpenDeleteDialog(false);
      setSelectedUser(null);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle set role
  const handleSetRole = async (newRole: RoleType) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const result = await authClient.admin.setRole({
        userId: selectedUser.id,
        role: newRole,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to update role");
        return;
      }

      const roleLabel = newRole === "admin" ? "Admin" : "User";
      toast.success(`Role updated to ${roleLabel}`);
      setOpenRoleDialog(false);
      setSelectedUser(null);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Super Admin permissions
  const superPermissions = [
    "Full system access",
    "Manage all admins and users",
    "Delete users and admins",
    "Configure all settings",
    "Cannot be demoted",
  ];

  // Admin permissions list
  const adminPermissions = [
    "Manage users (not super)",
    "Access all matters and contacts",
    "View paralegal KPI metrics",
    "Configure system settings",
    "Manage Docketwise sync",
  ];

  // User permissions list
  const userPermissions = [
    "View assigned matters",
    "Update matter fields",
    "View contacts",
    "Receive notifications",
    "View own metrics",
  ];

  // Get role badge variant
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "super":
        return <Badge variant="destructive">Super Admin</Badge>;
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  // Table columns
  const columns: ColumnDef<UserType>[] = [
    {
      header: "User",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>
              {row.original.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => getRoleBadge(row.original.role),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <LuEllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(row.original);
                setOpenRoleDialog(true);
              }}
              disabled={row.original.role === "super"}
            >
              <LuShield />
              <span>Change Role</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedUser(row.original);
                setOpenDeleteDialog(true);
              }}
              disabled={row.original.role === "super"}
            >
              <LuTrash />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Users & Roles</h1>
          <p className="text-muted-foreground">
            Manage system users and their permissions
          </p>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <LuPlus />
          <span>Add User</span>
        </Button>
      </div>

      {/* Role Permissions Card */}
      <Card className="mb-6 p-5">
        <h3 className="mb-4 font-semibold">Role Permissions</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LuCrown className="size-5 text-red-500" />
              <span className="font-medium">Super Admin</span>
            </div>
            <div className="space-y-2">
              {superPermissions.map((permission) => (
                <div
                  key={permission}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <LuCheck className="size-4 shrink-0 text-emerald-500" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LuShield className="size-5 text-purple-500" />
              <span className="font-medium">Admin</span>
            </div>
            <div className="space-y-2">
              {adminPermissions.map((permission) => (
                <div
                  key={permission}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <LuCheck className="size-4 shrink-0 text-emerald-500" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LuUser className="size-5 text-blue-500" />
              <span className="font-medium">User</span>
            </div>
            <div className="space-y-2">
              {userPermissions.map((permission) => (
                <div
                  key={permission}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <LuCheck className="size-4 shrink-0 text-emerald-500" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <p className="text-sm text-muted-foreground">
            {filteredTotal} user{filteredTotal !== 1 ? "s" : ""} total
          </p>
        </div>
        <DataTable
          data={filteredUsers}
          columns={columns}
          emptyMessage="No users found"
        />
      </div>

      {/* Create User Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with email and password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateUser)}>
            <FieldGroup>
              <Field>
                <FieldLabel>Full Name</FieldLabel>
                <Input
                  placeholder="John Doe"
                  {...createForm.register("name")}
                />
                {createForm.formState.errors.name && (
                  <FieldError>
                    {createForm.formState.errors.name.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel>Email Address</FieldLabel>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  {...createForm.register("email")}
                />
                {createForm.formState.errors.email && (
                  <FieldError>
                    {createForm.formState.errors.email.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...createForm.register("password")}
                />
                {createForm.formState.errors.password && (
                  <FieldError>
                    {createForm.formState.errors.password.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Controller
                  name="role"
                  control={createForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Admins can manage users and access all features.
                </p>
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={openRoleDialog} onOpenChange={setOpenRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant={selectedUser?.role === "user" ? "default" : "outline"}
              className="h-auto flex-col gap-2 py-4"
              onClick={() => handleSetRole("user")}
              disabled={isSubmitting || selectedUser?.role === "user"}
            >
              <LuUser className="size-5" />
              <span>User</span>
            </Button>
            <Button
              variant={selectedUser?.role === "admin" ? "default" : "outline"}
              className="h-auto flex-col gap-2 py-4"
              onClick={() => handleSetRole("admin")}
              disabled={isSubmitting || selectedUser?.role === "admin"}
            >
              <LuShield className="size-5" />
              <span>Admin</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UsersTable;
