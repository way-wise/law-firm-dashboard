"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
            <DrawerHeader className="border-b py-5 px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <DrawerTitle className="text-xl font-medium leading-tight">{matter.title}</DrawerTitle>
                  <DrawerDescription className="flex items-center gap-2 flex-wrap text-sm">
                    <span>{matter.clientName || "No client"}</span>
                    <span>•</span>
                    <span className="text-xs font-mono">#{matter.docketwiseId}</span>
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button variant="secondary" size="icon" className="shrink-0 ml-auto">
                    <X className="size-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 py-6">
              {/* Matter Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Matter Details
                </h4>

                {/* Type and Status Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {matter.matterType && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Type:</span>
                      <Badge variant="outline" className="text-sm font-medium">
                        {matter.matterType}
                      </Badge>
                    </div>
                  )}
                  {matter.status && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Status:</span>
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

              {/* Custom Fields */}
              {(matter.billingStatus || matter.totalHours || matter.customNotes) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Custom Fields
                    </h4>

                    {matter.billingStatus && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Billing Status</span>
                        <Badge variant={
                          matter.billingStatus === "PAID" ? "default" :
                          matter.billingStatus === "DUE" ? "destructive" : "secondary"
                        }>
                          {matter.billingStatus.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )}

                    {matter.totalHours !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Hours</span>
                        <span className="text-sm font-medium">{matter.totalHours}h</span>
                      </div>
                    )}

                    {matter.customNotes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm break-words bg-muted/50 rounded-lg p-3">{matter.customNotes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Deadlines */}
              {(matter.estimatedDeadline || matter.actualDeadline || matter.assignedDate) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Deadlines & Dates
                    </h4>

                    <div className="space-y-3">
                      {matter.assignedDate && (
                        <div className="flex items-center gap-3">
                          <Calendar className="size-4 text-muted-foreground" />
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm text-muted-foreground">Assigned Date</span>
                            <span className="text-sm font-medium">{formatDate(matter.assignedDate)}</span>
                          </div>
                        </div>
                      )}

                      {matter.estimatedDeadline && (
                        <div className="flex items-center gap-3">
                          <Clock className="size-4 text-muted-foreground" />
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm text-muted-foreground">Estimated Deadline</span>
                            <span className="text-sm font-medium">{formatDate(matter.estimatedDeadline)}</span>
                          </div>
                        </div>
                      )}

                      {matter.actualDeadline && (
                        <div className="flex items-center gap-3">
                          <Calendar className="size-4 text-muted-foreground" />
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm text-muted-foreground">Actual Deadline</span>
                            <span className="text-sm font-medium">{formatDate(matter.actualDeadline)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notes from Docketwise */}
              {matter.notes && matter.notes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Notes ({matter.notes.length})
                    </h4>
                    <div className="space-y-3">
                      {matter.notes.map((note) => (
                        <div key={note.id} className="rounded-lg border bg-card p-4 space-y-2">
                          {note.title && (
                            <h5 className="text-sm font-semibold">{note.title}</h5>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                            {note.content}
                          </p>
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
