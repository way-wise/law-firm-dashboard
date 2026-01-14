"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { client } from "@/lib/orpc/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { MatterType } from "@/schema/customMatterSchema";

interface EditMatterSheetProps {
  matter: MatterType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditMatterDialog({
  matter,
  open,
  onOpenChange,
  onSuccess,
}: EditMatterSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assignedDate, setAssignedDate] = useState("");
  const [estimatedDeadline, setEstimatedDeadline] = useState("");
  const [actualDeadline, setActualDeadline] = useState("");
  const [billingStatus, setBillingStatus] = useState<string>("");
  const [paralegalAssigned, setParalegalAssigned] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  useEffect(() => {
    if (matter) {
      setAssignedDate(
        matter.assignedDate ? format(new Date(matter.assignedDate), "yyyy-MM-dd") : ""
      );
      setEstimatedDeadline(
        matter.estimatedDeadline
          ? format(new Date(matter.estimatedDeadline), "yyyy-MM-dd")
          : ""
      );
      setActualDeadline(
        matter.actualDeadline
          ? format(new Date(matter.actualDeadline), "yyyy-MM-dd")
          : ""
      );
      setBillingStatus(matter.billingStatus || "");
      setParalegalAssigned(matter.paralegalAssigned || "");
      setCustomNotes(matter.customNotes || "");
    }
  }, [matter]);

  const handleSave = async () => {
    if (!matter) return;

    try {
      setIsLoading(true);
      await client.customMatters.update({
        id: matter.id,
        assignedDate: assignedDate ? new Date(assignedDate) : null,
        estimatedDeadline: estimatedDeadline ? new Date(estimatedDeadline) : null,
        actualDeadline: actualDeadline ? new Date(actualDeadline) : null,
        billingStatus: (billingStatus as "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE") || null,
        paralegalAssigned: paralegalAssigned || null,
        customNotes: customNotes || null,
      });

      toast.success("Matter updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating matter:", error);
      toast.error("Failed to update matter");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Matter</DialogTitle>
          <DialogDescription>
            Update custom fields for this matter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Matter Info (Read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Matter Title</Label>
            <p className="text-sm font-medium">{matter?.title}</p>
          </div>

          {/* Assigned Date */}
          <div className="space-y-2">
            <Label htmlFor="assignedDate">Assigned Date</Label>
            <Input
              id="assignedDate"
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
            />
          </div>

          {/* Estimated Deadline */}
          <div className="space-y-2">
            <Label htmlFor="estimatedDeadline">Estimated Deadline</Label>
            <Input
              id="estimatedDeadline"
              type="date"
              value={estimatedDeadline}
              onChange={(e) => setEstimatedDeadline(e.target.value)}
            />
          </div>

          {/* Actual Deadline */}
          <div className="space-y-2">
            <Label htmlFor="actualDeadline">Actual Deadline</Label>
            <Input
              id="actualDeadline"
              type="date"
              value={actualDeadline}
              onChange={(e) => setActualDeadline(e.target.value)}
            />
          </div>

          {/* Billing Status */}
          <div className="space-y-2">
            <Label htmlFor="billingStatus">Billing Status</Label>
            <Select value={billingStatus || undefined} onValueChange={setBillingStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select billing status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                <SelectItem value="PAYMENT_PLAN">Payment Plan</SelectItem>
                <SelectItem value="DUE">Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Paralegal Assigned */}
          <div className="space-y-2">
            <Label htmlFor="paralegalAssigned">Paralegal Assigned</Label>
            <Input
              id="paralegalAssigned"
              type="text"
              placeholder="Enter paralegal name"
              value={paralegalAssigned}
              onChange={(e) => setParalegalAssigned(e.target.value)}
            />
          </div>

          {/* Custom Notes */}
          <div className="space-y-2">
            <Label htmlFor="customNotes">Custom Notes</Label>
            <Textarea
              id="customNotes"
              placeholder="Add any custom notes..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
