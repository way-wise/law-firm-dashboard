"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clients } from "@/data/clients";
import { matterTypes } from "@/data/matter-types";
import { workers } from "@/data/workers";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const NewMatterPage = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const activeClients = clients;
  const activeMatterTypes = matterTypes.filter((mt) => mt.isActive);
  const activeWorkers = workers.filter((w) => w.isActive);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/matters">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create New Matter</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details to create a new immigration case
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center">
              <div
                className={`flex size-10 items-center justify-center rounded-full text-sm font-medium ${
                  s <= step
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < totalSteps && (
                <div
                  className={`mx-2 h-1 flex-1 rounded ${
                    s < step ? "bg-emerald-600" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className={step >= 1 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
            Client & Case Info
          </span>
          <span className={step >= 2 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
            Assignment
          </span>
          <span className={step >= 3 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
            Billing & Notes
          </span>
        </div>
      </div>

      {/* Step 1: Client & Case Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Client & Case Information</CardTitle>
            <CardDescription>
              Select the client and specify the matter type for this case
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Client <span className="text-destructive">*</span>
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col">
                          <span>{client.name}</span>
                          <span className="text-xs text-muted-foreground">{client.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Or{" "}
                  <span className="cursor-pointer text-emerald-600 hover:underline">
                    create a new client
                  </span>
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Matter Type <span className="text-destructive">*</span>
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select matter type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMatterTypes.map((mt) => (
                      <SelectItem key={mt.id} value={mt.id}>
                        <div className="flex items-center gap-2">
                          <span>{mt.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {mt.code}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Case Number <span className="text-destructive">*</span>
              </label>
              <Input placeholder="M-2024-XXX" />
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-generated if left blank
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Intake Date <span className="text-destructive">*</span>
              </label>
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Priority</label>
              <Select defaultValue="normal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Assignment */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Assignment</CardTitle>
            <CardDescription>
              Assign a paralegal or team member to handle this matter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Assigned Paralegal <span className="text-destructive">*</span>
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {activeWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      <div className="flex items-center gap-2">
                        <span>{worker.name}</span>
                        <Badge variant={worker.teamType === "inHouse" ? "default" : "secondary"} className="text-xs">
                          {worker.teamType === "inHouse" ? "In-House" : "Contractor"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({worker.activeCases} active)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Workload Overview */}
            <div>
              <h4 className="mb-3 text-sm font-medium">Team Workload</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeWorkers.slice(0, 4).map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{worker.activeCases}</p>
                      <p className="text-xs text-muted-foreground">active cases</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Assignment Notes
              </label>
              <Textarea
                placeholder="Any special instructions for the assigned team member..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Billing & Notes */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing & Additional Notes</CardTitle>
            <CardDescription>
              Set billing status and add any relevant notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Billing Status
                </label>
                <Select defaultValue="pending">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Retainer Amount
                </label>
                <Input type="number" placeholder="0.00" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Case Notes
              </label>
              <Textarea
                placeholder="Add any relevant notes about this matter..."
                rows={4}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Internal Tags
              </label>
              <Input placeholder="e.g., premium-client, expedited, complex" />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate tags with commas
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Previous
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={() => setStep(step + 1)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Continue
          </Button>
        ) : (
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="mr-2 size-4" />
            Create Matter
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewMatterPage;
