"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/orpc/client";
import { useRouter } from "@bprogress/next";
import { MultiSelect, Option } from "@/components/ui/multi-select";

interface StatusGroup {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  isSystem: boolean;
  matterCount: number;
  matterStatusIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface MatterStatus {
  id: string;
  docketwiseId: number;
  name: string;
}

export default function StatusGroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StatusGroup | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    displayOrder: 1,
    matterStatusIds: [] as string[],
  });

  // Fetch status groups
  const { data: statusGroupsData, isLoading } = useQuery({
    queryKey: ["statusGroups"],
    queryFn: async () => {
      const result = await client.statusGroups.get({ page: 1, perPage: 50 });
      return result;
    },
  });

  // Fetch all matter statuses for multi-select
  const { data: matterStatuses = [] } = useQuery<MatterStatus[]>({
    queryKey: ["matterStatuses"],
    queryFn: async () => {
      const statuses = await client.matterStatuses.get();
      return statuses;
    },
  });

  const statusGroups = statusGroupsData?.statusGroups || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => client.statusGroups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusGroups"] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<typeof formData>) => 
      client.statusGroups.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusGroups"] });
      setEditingGroup(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.statusGroups.delete({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusGroups"] });
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setFormData({ 
      name: "", 
      description: "", 
      color: "#3B82F6", 
      displayOrder: 1,
      matterStatusIds: [],
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingGroup) return;
    updateMutation.mutate({ id: editingGroup.id, ...formData });
  };

  const handleEdit = (group: StatusGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      color: group.color || "#3B82F6",
      displayOrder: group.displayOrder,
      matterStatusIds: group.matterStatusIds,
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Convert matter statuses to options for multi-select
  const statusOptions: Option[] = matterStatuses.map((status) => ({
    value: status.id,
    label: status.name,
  }));

  // Get selected options for multi-select
  const selectedStatuses: Option[] = formData.matterStatusIds
    .map((id) => {
      const status = matterStatuses.find((s) => s.id === id);
      return status ? { value: status.id, label: status.name } : null;
    })
    .filter((opt): opt is Option => opt !== null);

  const handleStatusChange = (options: Option[]) => {
    setFormData({
      ...formData,
      matterStatusIds: options.map((opt) => opt.value),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Status Groups</h1>
            <p className="text-muted-foreground">
              Group Docketwise statuses into custom categories for dashboard cards
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus />
          Add Status Group
        </Button>
      </div>

      {/* Status Groups Grid */}
      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : statusGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No status groups found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &ldquo;Add Status Group&rdquo; to create your first group
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-6">
            {statusGroups.map((group) => (
              <Card key={group.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="size-3 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: group.color || "#6B7280" }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {group.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(group)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(group.id)}
                      disabled={deletingId === group.id || group.isSystem}
                      title={group.isSystem ? "System groups cannot be deleted" : "Delete group"}
                    >
                      {deletingId === group.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {group.matterStatusIds.length} statuses mapped
                    </span>
                    <div className="flex gap-1">
                      {group.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                      <Badge variant={group.isActive ? "default" : "secondary"}>
                        {group.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Order: {group.displayOrder}
                    </span>
                    <Badge variant="outline">
                      {group.matterCount} matters
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={isCreateOpen || !!editingGroup} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingGroup(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Status Group" : "Add Status Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the status group details below."
                : "Create a custom status group by selecting Docketwise statuses."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                placeholder="e.g., Pending, Active, Completed"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Brief description of this status group"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statuses">Docketwise Statuses</Label>
              <MultiSelect
                options={statusOptions}
                value={selectedStatuses}
                onChange={handleStatusChange}
                placeholder="Select statuses..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Select one or more Docketwise workflow statuses to include in this group
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input 
                    id="color" 
                    type="color" 
                    className="w-12 h-10 p-1 cursor-pointer" 
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <Input 
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input 
                  id="displayOrder" 
                  type="number"
                  min={1}
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateOpen(false);
                setEditingGroup(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={editingGroup ? handleUpdate : handleCreate}
              disabled={!formData.name || formData.matterStatusIds.length === 0 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
