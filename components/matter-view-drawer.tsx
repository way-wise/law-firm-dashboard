"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Calendar, FileText, User, X, Loader2, Clock } from "lucide-react";
import { client } from "@/lib/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MatterViewDrawerProps {
  docketwiseId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to format dates safely - returns "-" for invalid/1970 dates
function formatDateSafe(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return "-";
  return formatDate(d) || "-";
}

export function MatterViewDrawer({ docketwiseId, open, onOpenChange }: MatterViewDrawerProps) {
  // Fetch matter details on-demand from Docketwise API
  const { data: matter, isLoading, error } = useQuery({
    queryKey: ["matter-detail", docketwiseId],
    queryFn: () => docketwiseId ? client.customMatters.getDetailByDocketwiseId({ docketwiseId }) : null,
    enabled: open && !!docketwiseId,
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent side="right" className="w-full max-w-2xl h-full flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <p className="text-destructive font-medium">Failed to load matter details</p>
            <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
          </div>
        ) : matter ? (
          <>
            <DrawerHeader>
              <div className="flex w-full items-center justify-between gap-4">
                <DrawerTitle className="text-xl font-medium">View Matter</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="secondary" size="icon">
                    <X className="size-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 py-6">
              {/* Matter Title & ID */}
              <div className="space-y-2">
                <h2 className="text-xl font-medium">{matter.title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">#{matter.docketwiseId}</span>
                  {matter.clientName && (
                    <>
                      <span>•</span>
                      <span>{matter.clientName}</span>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Matter Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Matter Details
                </h4>

                {/* Type and Status - Stacked Vertically */}
                <div className="space-y-3">
                  {matter.matterType && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="secondary" className="text-sm font-medium">
                        {matter.matterType}
                      </Badge>
                    </div>
                  )}
                  {matter.status && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant="default" className="text-sm">
                        {matter.status}
                      </Badge>
                    </div>
                  )}
                </div>

                {matter.description && (
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm break-words">{matter.description}</p>
                    </div>
                  </div>
                )}

                {/* Assignees */}
                {matter.assignees && (
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-2">Assignees</p>
                      <div className="flex flex-wrap gap-2">
                        {matter.assignees.split(",").map((assignee, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
                            <Avatar className="size-6">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(assignee.trim())}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{assignee.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Client */}
                {matter.clientName && (
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Client</p>
                      <p className="text-sm font-medium">{matter.clientName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Billing & Financial */}
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Billing & Financial
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Billing Status</span>
                    {matter.billingStatus ? (
                      <Badge variant={
                        matter.billingStatus === "PAID" ? "default" :
                        matter.billingStatus === "DUE" ? "destructive" : "secondary"
                      }>
                        {matter.billingStatus.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Hours</span>
                    <span className="text-sm font-medium">
                      {matter.totalHours !== null && matter.totalHours !== undefined ? `${matter.totalHours}h` : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Flat Fee</span>
                    <span className="text-sm font-medium">
                      {matter.flatFee !== null && matter.flatFee !== undefined ? `$${matter.flatFee.toLocaleString()}` : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deadlines & Dates */}
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Deadlines & Dates
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-sm text-muted-foreground">Assigned Date</span>
                      <span className="text-sm font-medium">{formatDateSafe(matter.assignedDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="size-4 text-muted-foreground" />
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-sm text-muted-foreground">Estimated Deadline</span>
                      <span className="text-sm font-medium">{formatDateSafe(matter.estimatedDeadline)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-sm text-muted-foreground">Actual Deadline</span>
                      <span className="text-sm font-medium">{formatDateSafe(matter.actualDeadline)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes from Docketwise */}
              {matter.notes && matter.notes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Notes from Docketwise ({matter.notes.length})
                    </h4>
                    <div className="space-y-3">
                      {matter.notes.map((note) => (
                        <div key={note.id} className="rounded-lg border bg-card p-4 space-y-2">
                          {note.title && (
                            <h5 className="text-sm font-semibold">{note.title}</h5>
                          )}
                          {note.content && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                              {note.content}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                            {note.created_by_name && (
                              <span>By {note.created_by_name}</span>
                            )}
                            {note.created_by_name && <span>•</span>}
                            <span>{new Date(note.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Custom Notes */}
              {matter.customNotes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Custom Notes
                    </h4>
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {matter.customNotes}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Edited By */}
              {matter.editedByUser && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Last Edited
                    </h4>
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(matter.editedByUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{matter.editedByUser.name}</p>
                        <p className="text-xs text-muted-foreground">{matter.editedByUser.email}</p>
                        {matter.editedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(matter.editedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Timeline */}
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h4>
                <div className="space-y-3">
                  {matter.docketwiseCreatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Started At</span>
                      <span className="text-sm">{formatDate(matter.docketwiseCreatedAt)}</span>
                    </div>
                  )}
                  {matter.docketwiseUpdatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="text-sm">{formatDate(matter.docketwiseUpdatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
