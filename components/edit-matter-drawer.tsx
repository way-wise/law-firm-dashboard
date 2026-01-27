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
import { DatePicker } from "@/components/ui/date-picker";
import { client } from "@/lib/orpc/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { MatterType } from "@/schema/customMatterSchema";
import { workers } from "@/data/workers";

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
}

export function EditMatterDrawer({
  matter,
  open,
  onOpenChange,
  onSuccess,
  matterTypes,
}: EditMatterDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [matterType, setMatterType] = useState("");
  const [matterTypeId, setMatterTypeId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState("");
  const [assignedDate, setAssignedDate] = useState<Date | null>(null);
  const [estimatedDeadline, setEstimatedDeadline] = useState<Date | null>(null);
  const [actualDeadline, setActualDeadline] = useState<Date | null>(null);
  const [billingStatus, setBillingStatus] = useState<string>("");
  const [assignees, setAssignees] = useState("");
  const [description, setDescription] = useState("");
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [customNotes, setCustomNotes] = useState("");

  // Get current matter type from preloaded data
  const currentMatterType = matterTypeId
    ? matterTypes.find(mt => mt.id === matterTypeId)
    : matter?.matterType
    ? matterTypes.find(mt => mt.name === matter.matterType)
    : null;

  // Get available statuses for the current matter type
  const availableStatuses = currentMatterType?.matterStatuses || [];
  
  // Always include current status as option even if not in the type's status list
  const statusOptions = [...availableStatuses];
  if (status && !statusOptions.some(s => s.name === status)) {
    statusOptions.push({
      id: 'current',
      docketwiseId: 0,
      name: status,
      duration: null,
      sort: null,
    });
  }

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
      setStatus(matter.status || "");
      setAssignedDate(matter.assignedDate ? new Date(matter.assignedDate) : null);
      setEstimatedDeadline(matter.estimatedDeadline ? new Date(matter.estimatedDeadline) : null);
      setActualDeadline(matter.actualDeadline ? new Date(matter.actualDeadline) : null);
      setBillingStatus(matter.billingStatus || "");
      setAssignees(matter.assignees || "");
      setDescription(matter.description || "");
      setTotalHours(matter.totalHours ?? null);
      setCustomNotes(matter.customNotes || "");
      
      // Find the matter type ID from the type name
      if (matter.matterType) {
        const foundType = matterTypes.find((mt: MatterTypeWithStatuses) => mt.name === matter.matterType);
        setMatterTypeId(foundType?.id || null);
      }
    }
  }, [matter, matterTypes]);

  const handleSave = async () => {
    if (!matter) return;

    try {
      setIsLoading(true);
      await client.customMatters.update({
        id: matter.id,
        title: title || undefined,
        description: description || null,
        matterType: matterType || null,
        clientName: clientName || null,
        status: status || null,
        assignedDate: assignedDate || null,
        estimatedDeadline: estimatedDeadline || null,
        actualDeadline: actualDeadline || null,
        billingStatus: billingStatus ? (billingStatus as "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE") : null,
        assignees: assignees || null,
        totalHours: totalHours,
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

              {/* Type/Status - Single field showing current type and status dropdown */}
              <div className="space-y-2">
                <Label htmlFor="typeStatus">Type / Status</Label>
                <div className="space-y-2">
                  {/* Show current matter type as text */}
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                    <span className="text-sm font-medium">
                      {currentMatterType ? currentMatterType.name : matterType || "No type set"}
                    </span>
                    {currentMatterType && (
                      <span className="text-xs text-muted-foreground">
                        ({currentMatterType.matterStatuses.length} stages)
                      </span>
                    )}
                  </div>
                  
                  {/* Status dropdown - always visible */}
                  <Select value={status || ""} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select workflow status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions
                        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
                        .map((statusOption) => (
                          <SelectItem key={statusOption.id} value={statusOption.name}>
                            <div className="flex items-center justify-between w-full">
                              <span>{statusOption.name}</span>
                              {statusOption.duration && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {statusOption.duration}d
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {availableStatuses.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      This matter type has no workflow stages defined. Showing current status only.
                    </p>
                  )}
                </div>
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Matter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Assigned Date */}
              <div className="space-y-2">
                <Label>Assigned Date</Label>
                <DatePicker
                  value={assignedDate}
                  onChange={(date) => setAssignedDate(date || null)}
                  placeholder="Select assigned date"
                />
              </div>

              {/* Estimated Deadline */}
              <div className="space-y-2">
                <Label>Estimated Deadline</Label>
                <DatePicker
                  value={estimatedDeadline}
                  onChange={(date) => setEstimatedDeadline(date || null)}
                  placeholder="Select estimated deadline"
                />
              </div>

              {/* Actual Deadline */}
              <div className="space-y-2">
                <Label>Actual Deadline</Label>
                <DatePicker
                  value={actualDeadline}
                  onChange={(date) => setActualDeadline(date || null)}
                  placeholder="Select actual deadline"
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

              {/* Assignees - Advanced Select */}
              <div className="space-y-2">
                <Label htmlFor="assignees">Assignees</Label>
                <AdvancedSelect
                  options={paralegalOptions}
                  value={assignees}
                  onChange={setAssignees}
                  placeholder="Select assignee"
                  emptyMessage="No assignees found"
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
