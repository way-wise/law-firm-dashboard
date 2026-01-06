"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matterTypes } from "@/data/matter-types";
import { workflowStages } from "@/data/workflow-stages";
import { workers } from "@/data/workers";
import { Search } from "lucide-react";

export function MatterFilters() {
  const activeStages = workflowStages.filter((s) => s.isActive && !s.isTerminal);
  const activeWorkers = workers.filter((w) => w.isActive);
  const activeMatterTypes = matterTypes.filter((mt) => mt.isActive);

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Filters</h3>
      
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by client name, email, paralegal, or case ID..."
          className="pl-10"
        />
      </div>

      {/* Filter Row 1 */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {activeStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Matter Type</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {activeMatterTypes.map((mt) => (
                <SelectItem key={mt.id} value={mt.id}>
                  {mt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Paralegal</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All Paralegals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Paralegals</SelectItem>
              {activeWorkers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Billing Status</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Date From</label>
          <Input type="date" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Date To</label>
          <Input type="date" />
        </div>
      </div>
    </Card>
  );
}
