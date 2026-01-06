"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface WorkerCard {
  id: string;
  name: string;
  caseCount: number;
  image: string | null;
}

interface TeamStats {
  inHouse: {
    totalActive: number;
    workers: WorkerCard[];
  };
  contractors: {
    totalActive: number;
    workers: WorkerCard[];
  };
}

interface TeamSectionProps {
  teamStats: TeamStats;
}

export function TeamSection({ teamStats }: TeamSectionProps) {
  const totalInHouse = teamStats.inHouse.workers.length;
  const totalContractors = teamStats.contractors.workers.length;
  const totalActiveCases = teamStats.inHouse.totalActive + teamStats.contractors.totalActive;

  return (
    <div className="space-y-4">
      {/* Header outside card */}
      <div>
        <h3 className="text-lg font-semibold">Team Overview</h3>
        <p className="text-sm text-muted-foreground">Managing {totalActiveCases} active cases</p>
      </div>
      
      {/* Card with team content */}
      <Card>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* In-House Team */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium">In-House Team</h4>
                <Badge>{totalInHouse} Members</Badge>
              </div>
              <div className="space-y-2">
                {teamStats.inHouse.workers.map((worker) => (
                  <WorkerCardComponent key={worker.id} worker={worker} />
                ))}
              </div>
            </div>

            {/* Contractors */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium">Contractors</h4>
                <Badge>{totalContractors} Members</Badge>
              </div>
              <div className="space-y-2">
                {teamStats.contractors.workers.map((worker) => (
                  <WorkerCardComponent key={worker.id} worker={worker} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WorkerCardComponent({ worker }: { worker: WorkerCard }) {
  const maxCases = 5;
  const progressPercent = Math.min((worker.caseCount / maxCases) * 100, 100);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={worker.image || undefined} alt={worker.name} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {worker.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{worker.name}</p>
          <p className="text-sm text-muted-foreground">
            {worker.caseCount} active {worker.caseCount === 1 ? "case" : "cases"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{Math.round(progressPercent)}%</div>
        <div className="text-xs text-muted-foreground">capacity</div>
      </div>
    </div>
  );
}
