"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { DatePicker } from "@/components/ui/date-picker";
import { client } from "@/lib/orpc/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { MatterType } from "@/schema/customMatterSchema";

interface MatterTypeWithStatuses {
  id: string;
  docketwiseId: number;
  name: string;
  matterStatuses: {
    id: string;
    docketwiseId: number;
    name: string;
    duration: number | null;
    sort: number | null;
  }[];
}

interface EditMatterDrawerProps {
  matter: MatterType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  matterTypes: MatterTypeWithStatuses[];
  teams: {
    id: string;
    docketwiseId: number;
    fullName: string | null;
    email: string;
    isActive: boolean;
  }[];
}

export function EditMatterDrawer({
  matter,
  open,
  onOpenChange,
  onSuccess,
}: EditMatterDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assignedDate, setAssignedDate] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [billingStatus, setBillingStatus] = useState<string>("");
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [flatFee, setFlatFee] = useState<number | null>(null);
  const [customNotes, setCustomNotes] = useState("");

  useEffect(() => {
    if (matter) {
      setAssignedDate(matter.assignedDate ? new Date(matter.assignedDate) : null);
      setDeadline(matter.deadline ? new Date(matter.deadline) : null);
      setBillingStatus(matter.billingStatus || "");
      setTotalHours(matter.totalHours ?? null);
      setFlatFee(matter.flatFee ?? null);
      setCustomNotes(matter.customNotes || "");
    }
  }, [matter]);

  const handleSave = async () => {
    if (!matter) return;

    try {
      setIsLoading(true);
      await client.customMatters.update({
        id: matter.id,
        assignedDate: assignedDate || null,
        deadline: deadline || null,
        billingStatus: billingStatus ? (billingStatus as "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE") : null,
        totalHours: totalHours,
        flatFee: flatFee,
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent side="right" className="w-full max-w-2xl flex flex-col h-full">
        {matter && (
          <>
            <DrawerHeader className="shrink-0">
              <DrawerTitle className="text-xl font-medium">Edit Matter</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-lg">
                  <X />
                </Button>
              </DrawerClose>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
              {/* Matter Info - Read Only from Docketwise */}
              <div className="pb-4 border-b space-y-3">
                <p className="text-sm font-semibold">Matter Information (from Docketwise)</p>
                <div className="space-y-2 bg-muted/30 p-3 rounded-md">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="text-sm font-medium">{matter.title || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type / Status</Label>
                    <p className="text-sm">{matter.matterType || "-"} / {matter.status || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Client</Label>
                    <p className="text-sm">{matter.clientName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assignees</Label>
                    <p className="text-sm">{matter.assignees || "-"}</p>
                  </div>
                  {matter.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm">{matter.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Custom Fields */}
              <div className="space-y-1">
                <p className="text-sm font-semibold">Custom Fields (Editable)</p>
                <p className="text-xs text-muted-foreground">These fields are specific to your dashboard</p>
              </div>

              {/* Assigned Date */}
              <div className="space-y-2">
                <Label>Assigned Date</Label>
                <DatePicker
                  value={assignedDate && new Date(assignedDate).getFullYear() > 1970 ? assignedDate : null}
                  onChange={(date) => setAssignedDate(date || null)}
                  placeholder="Select assigned date"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label>Deadline</Label>
                <DatePicker
                  value={deadline && new Date(deadline).getFullYear() > 1970 ? deadline : null}
                  onChange={(date) => setDeadline(date || null)}
                  placeholder="Select deadline"
                />
              </div>

              {/* Billing Status */}
              <div className="space-y-2">
                <Label htmlFor="billingStatus">Billing Status</Label>
                <Select value={billingStatus || "NOT_SET"} onValueChange={(value) => setBillingStatus(value === "NOT_SET" ? "" : value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select billing status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SET">Not Set</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                    <SelectItem value="PAYMENT_PLAN">Payment Plan</SelectItem>
                    <SelectItem value="DUE">Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total Hours */}
              <div className="space-y-2">
                <Label htmlFor="totalHours">Total Hours</Label>
                <Input
                  id="totalHours"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g., 10.5"
                  value={totalHours ?? ""}
                  onChange={(e) => setTotalHours(e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              {/* Flat Fee */}
              <div className="space-y-2">
                <Label htmlFor="flatFee">Flat Fee ($)</Label>
                <Input
                  id="flatFee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 2500.00"
                  value={flatFee ?? ""}
                  onChange={(e) => setFlatFee(e.target.value ? parseFloat(e.target.value) : null)}
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

            {/* Action Buttons - Fixed at bottom */}
            <div className="shrink-0 flex justify-end gap-3 py-3 px-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
