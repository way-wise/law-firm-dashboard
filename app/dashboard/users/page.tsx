"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Shield, 
  User, 
  Mail,
  Check,
  Loader2,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  emailVerified: boolean;
  banned?: boolean | null;
  createdAt: Date;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form state for creating user (Better-Auth admin.createUser)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  // Fetch users from Better-Auth admin API
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: { limit: 100 },
      });
      return result.data;
    },
  });

  const users: User[] = usersData?.users || [];

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await authClient.admin.createUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role as "user" | "admin",
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsCreateOpen(false);
      setFormData({ name: "", email: "", password: "", role: "user" });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await authClient.admin.removeUser({ userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  // Set role mutation
  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "user" | "admin" }) => {
      await authClient.admin.setRole({ userId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleCreateUser = () => {
    createMutation.mutate(formData);
  };

  const isLoading = createMutation.isPending;

  const adminPermissions = [
    "Manage all users and roles",
    "Access all matters and contacts",
    "View paralegal KPI metrics",
    "Configure system settings",
    "Manage Docketwise integration",
  ];

  const userPermissions = [
    "View assigned matters",
    "Edit matter custom fields",
    "View contacts and documents",
    "Receive notifications",
    "Update own profile",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users & Roles</h1>
          <p className="text-muted-foreground">
            Manage system users and their permissions
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with email and password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins can manage users and access all features.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={!formData.name || !formData.email || !formData.password || isLoading}
              >
                {isLoading && <Loader2 className="animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Permissions - Now at top */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Role Permissions</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-purple-500" />
              <span className="font-medium">Admin</span>
            </div>
            <div className="space-y-2">
              {adminPermissions.map((permission) => (
                <div key={permission} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="size-5 text-blue-500" />
              <span className="font-medium">User</span>
            </div>
            <div className="space-y-2">
              {userPermissions.map((permission) => (
                <div key={permission} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card>
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>
                    {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name}</p>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "Admin" : "User"}
                    </Badge>
                    {!user.emailVerified && (
                      <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}