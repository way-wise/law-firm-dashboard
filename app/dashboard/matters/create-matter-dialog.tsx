"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/tanstack-query";
import { toast } from "sonner";

const billingStatusOptions = [
  { value: "PAID", label: "Paid" },
  { value: "DEPOSIT_PAID", label: "Deposit Paid" },
  { value: "PAYMENT_PLAN", label: "Payment Plan" },
  { value: "DUE", label: "Due" },
];

export function CreateMatterDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    matterType: "",
    paralegalAssigned: "",
    assignedDate: "",
    estimatedDeadline: "",
    billingStatus: "" as "" | "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE",
    customNotes: "",
  });

  const createMutation = useMutation(
    orpc.customMatters.create.mutationOptions({
      onSuccess: () => {
        toast.success("Matter created successfully");
        setOpen(false);
        resetForm();
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create matter");
      },
    })
  );

  const resetForm = () => {
    setFormData({
      title: "",
      clientName: "",
      matterType: "",
      paralegalAssigned: "",
      assignedDate: "",
      estimatedDeadline: "",
      billingStatus: "",
      customNotes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate({
      title: formData.title,
      clientName: formData.clientName || undefined,
      matterType: formData.matterType || undefined,
      assignees: formData.paralegalAssigned || undefined,
      assignedDate: formData.assignedDate ? new Date(formData.assignedDate) : undefined,
      estimatedDeadline: formData.estimatedDeadline ? new Date(formData.estimatedDeadline) : undefined,
      billingStatus: formData.billingStatus || undefined,
      customNotes: formData.customNotes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Create Matter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Matter</DialogTitle>
          <DialogDescription>
            Create a new matter in your local database. This matter will be marked as edited
            and won&apos;t be overwritten by Docketwise sync.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Matter title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Client name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="matterType">Matter Type</Label>
                <Input
                  id="matterType"
                  placeholder="e.g., H-1B, I-485, N-400"
                  value={formData.matterType}
                  onChange={(e) => setFormData({ ...formData, matterType: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paralegalAssigned">Assigned Paralegal</Label>
                <Input
                  id="paralegalAssigned"
                  placeholder="Paralegal name"
                  value={formData.paralegalAssigned}
                  onChange={(e) => setFormData({ ...formData, paralegalAssigned: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billingStatus">Billing Status</Label>
                <Select
                  value={formData.billingStatus}
                  onValueChange={(value) => setFormData({ ...formData, billingStatus: value as typeof formData.billingStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignedDate">Assigned Date</Label>
                <Input
                  id="assignedDate"
                  type="date"
                  value={formData.assignedDate}
                  onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedDeadline">Estimated Deadline</Label>
                <Input
                  id="estimatedDeadline"
                  type="date"
                  value={formData.estimatedDeadline}
                  onChange={(e) => setFormData({ ...formData, estimatedDeadline: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customNotes">Notes</Label>
              <Textarea
                id="customNotes"
                placeholder="Additional notes about this matter"
                value={formData.customNotes}
                onChange={(e) => setFormData({ ...formData, customNotes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !formData.title}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Matter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
