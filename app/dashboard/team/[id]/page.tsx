import { getWorkerById } from "@/data/workers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface TeamMemberPageProps {
  params: Promise<{ id: string }>;
}

const TeamMemberPage = async ({ params }: TeamMemberPageProps) => {
  const { id } = await params;
  const worker = getWorkerById(id);

  if (!worker) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/team">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{worker.name}</h1>
          <p className="text-muted-foreground">{worker.title}</p>
        </div>
      </div>

      {/* Team Member Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Team Member Information</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
              <p className="text-sm">{worker.name}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p className="text-sm">{worker.email}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
              <p className="text-sm">{worker.title || "-"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Team Type</h3>
              <Badge variant={worker.teamType === "inHouse" ? "default" : "secondary"}>
                {worker.teamType === "inHouse" ? "In-House" : "Contractor"}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <Badge variant={worker.isActive ? "success" : "secondary"}>
                {worker.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Specializations</h3>
              <div className="flex flex-wrap gap-1">
                {worker.specializations.map((spec) => (
                  <Badge key={spec} variant="outline">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Member Since</h3>
              <p className="text-sm">
                {new Date(worker.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* KPIs Card */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{worker.activeCases}</p>
              <p className="text-xs text-muted-foreground">Active Cases</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{worker.totalCasesHandled}</p>
              <p className="text-xs text-muted-foreground">Total Handled</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{worker.avgResolutionDays}d</p>
              <p className="text-xs text-muted-foreground">Avg Resolution</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{worker.clientSatisfaction}/5</p>
              <p className="text-xs text-muted-foreground">Satisfaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Future: Add more KPI sections here */}
      {/* Example: Charts, case history, performance trends, etc. */}
    </div>
  );
};

export default TeamMemberPage;

