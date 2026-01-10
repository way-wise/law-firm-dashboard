"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { MatterSchemaType } from "@/router/matters";

// Helper functions
const getClientName = (client?: { first_name: string; last_name: string }) => {
  if (!client) return "Unknown";
  return `${client.first_name} ${client.last_name}`.trim();
};

const getStatusName = (matter: MatterSchemaType) => 
  matter.status?.name || "No Status";

const getTypeName = (matter: MatterSchemaType) => 
  matter.type?.name || "No Type";
import { format } from "date-fns";
import {
  Calendar,
  FileText,
  Hash,
  Star,
  StickyNote,
  User,
  X,
} from "lucide-react";

interface MatterDetailSheetProps {
  matter: MatterSchemaType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatterDetailSheet({ matter, open, onOpenChange }: MatterDetailSheetProps) {
  if (!matter) return null;

  const clientName = getClientName(matter.client);
  const statusName = getStatusName(matter);
  const typeName = getTypeName(matter);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent side="right" className="w-full max-w-2xl overflow-x-hidden">
        <DrawerHeader>
          <div className="flex flex-col gap-1">
            <DrawerTitle className="text-xl font-medium">{clientName}</DrawerTitle>
            <DrawerDescription className="flex items-center gap-2">
              <span>{typeName}</span>
              <span>•</span>
              <span className="font-mono">{matter.number}</span>
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-lg">
              <X />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex flex-col gap-6 overflow-y-auto overflow-x-hidden p-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <Badge 
              variant={statusName.toLowerCase().includes("rfe") ? "destructive" : 
                       statusName.toLowerCase().includes("filed") || statusName.toLowerCase().includes("approved") ? "default" : "secondary"}
              className="text-sm"
            >
              {statusName}
            </Badge>
            {matter.archived && (
              <Badge variant="outline">Archived</Badge>
            )}
          </div>

          <Separator />

          {/* Matter Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Matter Information</h4>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matter Type</p>
                  <p className="text-sm font-medium">{typeName}</p>
                </div>
              </div>

              {matter.description && (
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                    <StickyNote className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm break-words">{matter.description}</p>
                  </div>
                </div>
              )}

              {matter.receipt_number && (
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                    <Hash className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Receipt Number</p>
                    <p className="text-sm font-mono font-medium">{matter.receipt_number}</p>
                  </div>
                </div>
              )}

              {matter.priority_date && (
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Priority Date</p>
                    <p className="text-sm font-medium">
                      {format(new Date(matter.priority_date), "MMM d, yyyy")}
                      {matter.priority_date_status !== "undefined" && (
                        <Badge variant={matter.priority_date_status === "current" ? "default" : "secondary"} className="ml-2 text-xs">
                          {matter.priority_date_status === "current" ? "Current" : "Not Current"}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Client Information */}
          {matter.client && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Client</h4>
              
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{clientName}</p>
                  {matter.client.email && (
                    <p className="text-xs text-muted-foreground">{matter.client.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* USCIS Receipts */}
          {matter.receipts && matter.receipts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">USCIS Receipts</h4>
                
                <div className="space-y-3">
                  {matter.receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                      <div>
                        <p className="font-mono text-sm font-medium">{receipt.number}</p>
                        {receipt.description && (
                          <p className="text-xs text-muted-foreground">{receipt.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {receipt.status_update_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {matter.notes && matter.notes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Notes</h4>
                
                <div className="space-y-3">
                  {matter.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="rounded-lg border bg-muted/50 p-3 overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium break-words flex-1 min-w-0">{note.title}</p>
                        {note.starred && (
                          <Star className="size-4 flex-shrink-0 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 break-words">{note.content}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {note.created_by_name && <span className="break-all">{note.created_by_name}</span>}
                        <span>•</span>
                        <span>{format(new Date(note.date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Dates */}
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h4>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{format(new Date(matter.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm">{format(new Date(matter.updated_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
