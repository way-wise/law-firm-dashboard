"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

interface TeamMember {
  name: string;
  activeMatters: number;
  completedCount: number;
  avgDaysToFile?: number;
  onTimeRate?: number;
}

interface TeamPerformanceCardsProps {
  members: TeamMember[];
  title?: string;
  activeStatusGroupCount?: number; // Total from Active status group
}

export function TeamPerformanceCards({ members, title = "In-House Team", activeStatusGroupCount }: TeamPerformanceCardsProps) {
  // Use Active status group count if provided, otherwise sum team member counts
  const totalActive = activeStatusGroupCount ?? members.reduce((sum, m) => sum + m.activeMatters, 0);

  if (members.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">No team members found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <User className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge>
          {totalActive} active cases
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.slice(0, 6).map((member, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.activeMatters} Matters assigned</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <User className="size-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
