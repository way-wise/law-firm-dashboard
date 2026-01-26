"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdvancedSelect } from "@/components/ui/advanced-select";
import { Textarea } from "@/components/ui/textarea";
import { clients, getContactName } from "@/data/clients";
import { matterStatuses, matterTypes } from "@/data/matters";
import { workers } from "@/data/workers";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// Form schemas for each step - all optional for demo
const step1Schema = z.object({
  client_id: z.string().optional(),
  matter_type_id: z.string().optional(),
  title: z.string().optional(),
  workflow_stage_id: z.string().optional(),
  case_number: z.string().optional(),
  priority_date: z.string().optional(),
  description: z.string().optional(),
});

const step2Schema = z.object({
  paralegal_id: z.string().optional(),
  attorney_id: z.string().optional(),
  assignment_notes: z.string().optional(),
});

const step3Schema = z.object({
  billing_status: z.string().optional(),
  retainer_amount: z.string().optional(),
  total_hours: z.string().optional(),
  case_notes: z.string().optional(),
  tags: z.string().optional(),
});

// Combined schema
const matterSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type MatterInput = z.infer<typeof matterSchema>;

// Step configuration
const steps = [
  {
    id: 1,
    title: "Case Info",
    icon: Briefcase,
  },
  {
    id: 2,
    title: "Assignment",
    icon: Users,
  },
  {
    id: 3,
    title: "Billing",
    icon: DollarSign,
  },
];

const NewMatterForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeClients = clients;
  const activeWorkers = workers.filter((w) => w.isActive);

  const form = useForm<MatterInput>({
    resolver: zodResolver(matterSchema),
    defaultValues: {
      client_id: "",
      matter_type_id: "",
      case_number: "",
      title: "",
      description: "",
      workflow_stage_id: "1",
      priority_date: "",
      paralegal_id: "",
      attorney_id: "",
      assignment_notes: "",
      billing_status: "pending",
      retainer_amount: "",
      case_notes: "",
      tags: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: MatterInput) => {
    console.log("Matter data:", data);
    // TODO: API call to create matter
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitted(true);
  };

  // Validate current step before proceeding - all optional for demo
  const validateStep = async () => {
    return true;
  };

  // Options for AdvancedSelect components
  const clientOptions = activeClients.map((client) => ({
    value: client.id.toString(),
    label: getContactName(client),
  }));

  const paralegalOptions = activeWorkers.map((worker) => ({
    value: worker.id,
    label: worker.name,
  }));

  const attorneyOptions = activeWorkers
    .filter((w) => w.title.toLowerCase().includes("attorney"))
    .map((worker) => ({
      value: worker.id,
      label: worker.name,
    }));

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/matters">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create New Matter</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details to create a new immigration case
          </p>
        </div>
      </div>

      {/* Timeline Progress */}
      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = isSubmitted || currentStep > step.id;
          const isCurrent = !isSubmitted && currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className="relative flex flex-1 flex-col items-center"
            >
              {/* Connector Line - positioned before circle */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-7 left-[calc(50%+32px)] h-0.5 w-[calc(100%-64px)]",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}

              {/* Step Circle */}
              <div
                className={cn(
                  "relative z-10 flex size-14 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-primary/10 text-primary",
                  !isCompleted && !isCurrent && "border-border bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-6" />
                ) : (
                  <Icon className="size-6" />
                )}
              </div>

              {/* Step Title */}
              <p
                className={cn(
                  "mt-2 text-center text-sm font-medium",
                  isCompleted && "text-primary",
                  isCurrent && "text-primary",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card p-6">
        {/* Success State */}
        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-10" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold">Matter Created Successfully!</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Your new matter has been created and is ready for processing.
            </p>
            <div className="mt-8 flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/matters">
                  <Eye />
                  View All Matters
                </Link>
              </Button>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentStep(1);
                  form.reset();
                }}
              >
                <Plus />
                Create Another Matter
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            autoComplete="off"
          >
            <FieldSet disabled={form.formState.isSubmitting}>
              {/* Step 1: Case Information */}
              {currentStep === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Case Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Select the client and specify the matter details
                  </p>
                </div>

                <FieldGroup>
                  {/* Client Selection */}
                  <Controller
                    name="client_id"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="client_id">Client</FieldLabel>
                        <AdvancedSelect
                          options={clientOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a client"
                        />
                        <p className="text-xs text-muted-foreground">
                          Or{" "}
                          <Link
                            href="/dashboard/contacts/new"
                            className="text-primary hover:underline"
                          >
                            create a new client
                          </Link>
                        </p>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Matter Type & Workflow Stage */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="matter_type_id"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="matter_type_id">Matter Type</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select matter type" />
                            </SelectTrigger>
                            <SelectContent>
                              {matterTypes.map((mt) => (
                                <SelectItem key={mt.id} value={mt.id.toString()}>
                                  {mt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="workflow_stage_id"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="workflow_stage_id">Workflow Stage</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                              {matterStatuses.map((status) => (
                                <SelectItem key={status.id} value={status.id.toString()}>
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Title */}
                  <Controller
                    name="title"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="title">Matter Title</FieldLabel>
                        <Input
                          {...field}
                          id="title"
                          placeholder="e.g., John Doe - H-1B Petition"
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Case Number & Priority Date */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="case_number"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="case_number">Case Number</FieldLabel>
                          <Input
                            {...field}
                            id="case_number"
                            placeholder="M-2024-XXX (auto-generated if blank)"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="priority_date"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="priority_date">Priority Date</FieldLabel>
                          <Input {...field} id="priority_date" type="date" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Description */}
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="description">Description</FieldLabel>
                        <Textarea
                          {...field}
                          id="description"
                          placeholder="Brief description of the matter..."
                          rows={3}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </div>
            )}

            {/* Step 2: Team Assignment */}
            {currentStep === 2 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Team Assignment</h2>
                  <p className="text-sm text-muted-foreground">
                    Assign team members to handle this matter
                  </p>
                </div>

                <FieldGroup>
                  {/* Paralegal & Attorney */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="paralegal_id"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="paralegal_id">Paralegal</FieldLabel>
                          <AdvancedSelect
                            options={paralegalOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select paralegal"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="attorney_id"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="attorney_id">Attorney</FieldLabel>
                          <AdvancedSelect
                            options={attorneyOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select attorney"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Assignment Notes */}
                  <Controller
                    name="assignment_notes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="assignment_notes">Assignment Notes</FieldLabel>
                        <Textarea
                          {...field}
                          id="assignment_notes"
                          placeholder="Any special instructions for the assigned team member..."
                          rows={3}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </div>
            )}

            {/* Step 3: Billing & Notes */}
            {currentStep === 3 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Billing & Additional Notes</h2>
                  <p className="text-sm text-muted-foreground">
                    Set billing status and add any relevant notes
                  </p>
                </div>

                <FieldGroup>
                  {/* Billing Status & Retainer */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="billing_status"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="billing_status">Billing Status</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="invoiced">Invoiced</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="retainer_amount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="retainer_amount">Retainer Amount</FieldLabel>
                          <Input
                            {...field}
                            id="retainer_amount"
                            type="number"
                            placeholder="0.00"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Total Hours */}
                  <Controller
                    name="total_hours"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="total_hours">Total Hours</FieldLabel>
                        <Input
                          {...field}
                          id="total_hours"
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="e.g., 10.5"
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Case Notes */}
                  <Controller
                    name="case_notes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="case_notes">Case Notes</FieldLabel>
                        <Textarea
                          {...field}
                          id="case_notes"
                          placeholder="Add any relevant notes about this matter..."
                          rows={4}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Tags */}
                  <Controller
                    name="tags"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="tags">Internal Tags</FieldLabel>
                        <Input
                          {...field}
                          id="tags"
                          placeholder="e.g., premium-client, expedited, complex"
                        />
                        <p className="text-xs text-muted-foreground">
                          Separate tags with commas
                        </p>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button type="button" onClick={handleNext}>
                  Next Step
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => form.handleSubmit(onSubmit)()}
                  isLoading={form.formState.isSubmitting}
                >
                  <Check />
                  Create Matter
                </Button>
              )}
            </div>
            </FieldSet>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewMatterForm;
