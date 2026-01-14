"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
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
import { AdvancedSelect, type AdvancedSelectOption } from "@/components/ui/advanced-select";
import { client } from "@/lib/orpc/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { X } from "lucide-react";
import type { MatterType } from "@/schema/customMatterSchema";
import { workers } from "@/data/workers";

interface EditMatterDrawerProps {
  matter: MatterType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditMatterDrawer({
  matter,
  open,
  onOpenChange,
  onSuccess,
}: EditMatterDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [matterType, setMatterType] = useState("");
  const [clientName, setClientName] = useState("");
  const [workflowStage, setWorkflowStage] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [estimatedDeadline, setEstimatedDeadline] = useState("");
  const [actualDeadline, setActualDeadline] = useState("");
  const [billingStatus, setBillingStatus] = useState<string>("");
  const [paralegalAssigned, setParalegalAssigned] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Get active paralegals for dropdown
  const paralegalOptions: AdvancedSelectOption[] = workers
    .filter((w) => w.isActive && w.teamType === "inHouse")
    .map((w) => ({
      value: w.name,
      label: w.name,
      description: w.title,
    }));

  useEffect(() => {
    if (matter) {
      setTitle(matter.title || "");
      setMatterType(matter.matterType || "");
      setClientName(matter.clientName || "");
      setWorkflowStage(matter.workflowStage || "");
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
        title: title || undefined,
        matterType: matterType || null,
        clientName: clientName || null,
        workflowStage: workflowStage || null,
        assignedDate: assignedDate ? new Date(assignedDate) : null,
        estimatedDeadline: estimatedDeadline ? new Date(estimatedDeadline) : null,
        actualDeadline: actualDeadline ? new Date(actualDeadline) : null,
        billingStatus: billingStatus ? (billingStatus as "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE") : null,
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent side="right" className="w-full max-w-2xl flex flex-col h-full">
        {matter && (
          <>
            <DrawerHeader className="shrink-0">
              <div className="flex flex-col gap-1">
                <DrawerTitle className="text-xl font-medium">Edit Matter</DrawerTitle>
                <DrawerDescription>
                  Update custom fields for {matter.title}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-lg">
                  <X />
                </Button>
              </DrawerClose>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
              {/* Matter Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Matter Title</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Matter Type */}
              <div className="space-y-2">
                <Label htmlFor="matterType">Matter Type</Label>
                <Input
                  id="matterType"
                  type="text"
                  placeholder="e.g., Family Based Petition"
                  value={matterType}
                  onChange={(e) => setMatterType(e.target.value)}
                />
              </div>

              {/* Client Name */}
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  type="text"
                  placeholder="Client full name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              {/* Workflow Stage */}
              <div className="space-y-2">
                <Label htmlFor="workflowStage">Workflow Stage</Label>
                <Input
                  id="workflowStage"
                  type="text"
                  placeholder="e.g., Case Evaluation"
                  value={workflowStage}
                  onChange={(e) => setWorkflowStage(e.target.value)}
                />
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

              {/* Paralegal Assigned - Advanced Select */}
              <div className="space-y-2">
                <Label htmlFor="paralegalAssigned">Paralegal Assigned</Label>
                <AdvancedSelect
                  options={paralegalOptions}
                  value={paralegalAssigned}
                  onChange={setParalegalAssigned}
                  placeholder="Select paralegal"
                  emptyMessage="No paralegals found"
                  isClearable
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
            <div className="shrink-0 flex justify-end gap-3 p-6 border-t bg-background">
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
