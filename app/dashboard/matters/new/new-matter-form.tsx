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
import { client } from "@/lib/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { TeamMemberSchemaType } from "@/schema/teamSchema";

// Extended team type for form usage
interface TeamMember extends TeamMemberSchemaType {
  docketwiseId?: number;
  fullName?: string;
}

// Form schema matching database fields
const step1Schema = z.object({
  clientId: z.number().min(1, "Please select a client"),
  clientName: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  matterTypeId: z.number().optional(),
  matterType: z.string().optional(),
  statusId: z.number().optional(),
  status: z.string().optional(),
  priorityDate: z.date().optional(),
});

const step2Schema = z.object({
  teamId: z.number().optional(),
  assignees: z.string().optional(),
  assignedDate: z.date().optional(),
});

const step3Schema = z.object({
  billingStatus: z.enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"]).optional(),
  totalHours: z.number().optional(),
  flatFee: z.number().optional(),
  estimatedDeadline: z.date().optional(),
  actualDeadline: z.date().optional(),
  customNotes: z.string().optional(),
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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real data from API
  const { data: contactsData } = useQuery({
    queryKey: ["contacts-all"],
    queryFn: () => client.contacts.get({ page: 1 }),
  });
  const contacts = contactsData?.data || [];

  const { data: matterTypesData } = useQuery({
    queryKey: ["matter-types-all"],
    queryFn: () => client.matterTypes.get(),
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams-all"],
    queryFn: () => client.team.get({ page: 1 }),
  });
  // Map team data to include docketwiseId and fullName for easier access
  const teams: TeamMember[] = (teamsData?.data || []).map((team: TeamMemberSchemaType) => ({
    ...team,
    docketwiseId: team.id,
    fullName: team.first_name && team.last_name 
      ? `${team.first_name} ${team.last_name}`
      : team.first_name || team.last_name || team.email,
  }));

  const form = useForm<MatterInput>({
    resolver: zodResolver(matterSchema),
    defaultValues: {
      title: "",
      description: "",
      customNotes: "",
    },
    mode: "onBlur",
  });

  // Watch matterTypeId to get available statuses
  const selectedMatterTypeId = form.watch("matterTypeId");
  const selectedMatterType = matterTypesData?.find((mt) => mt.docketwiseId === selectedMatterTypeId);
  const availableStatuses = selectedMatterType?.matterStatuses || [];

  const onSubmit = async (data: MatterInput) => {
    try {
      setIsSubmitting(true);

      // Create matter in local database with all fields
      await client.customMatters.create({
        title: data.title,
        description: data.description,
        clientName: data.clientName,
        clientId: data.clientId,
        matterType: data.matterType,
        matterTypeId: data.matterTypeId,
        status: data.status,
        assignees: data.assignees,
        assignedDate: data.assignedDate,
        estimatedDeadline: data.estimatedDeadline,
        billingStatus: data.billingStatus,
        customNotes: data.customNotes,
      });

      toast.success("Matter created successfully!");
      setIsSubmitted(true);

      // Optionally sync to Docketwise API (only if you want to)
      // This would use client.matters.create() with only allowed fields:
      // { title, description, client_id, user_ids }

    } catch (error) {
      console.error("Error creating matter:", error);
      toast.error("Failed to create matter. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate current step before proceeding
  const validateStep = async () => {
    if (currentStep === 1) {
      const result = await form.trigger(["clientId", "title"]);
      return result;
    }
    return true;
  };

  // Options for AdvancedSelect components
  const clientOptions = contacts.map((contact) => {
    const name = contact.firstName && contact.lastName
      ? `${contact.firstName} ${contact.lastName}`
      : contact.firstName || contact.lastName || contact.email;
    return {
      value: String(contact.id),
      label: name,
      description: contact.email,
    };
  });

  const teamOptions = teams.map((team) => ({
    value: String(team.docketwiseId),
    label: team.fullName || team.email,
    description: team.email,
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
              <Button variant="outline" onClick={() => router.push("/dashboard/matters")}>
                <Eye />
                View All Matters
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
            <FieldSet disabled={isSubmitting}>
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
                    name="clientId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="clientId">Client *</FieldLabel>
                        <AdvancedSelect
                          options={clientOptions}
                          value={field.value ? String(field.value) : ""}
                          onChange={(value) => {
                            const clientId = parseInt(value);
                            form.setValue("clientId", clientId);
                            const contact = contacts.find(c => c.id === clientId);
                            if (contact) {
                              const name = contact.firstName && contact.lastName
                                ? `${contact.firstName} ${contact.lastName}`
                                : contact.firstName || contact.lastName || contact.email;
                              form.setValue("clientName", name);
                            }
                          }}
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

                  {/* Matter Type & Status */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="matterTypeId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="matterTypeId">Matter Type</FieldLabel>
                          <Select 
                            value={field.value ? String(field.value) : ""} 
                            onValueChange={(value) => {
                              const id = parseInt(value);
                              form.setValue("matterTypeId", id);
                              const mt = matterTypesData?.find((m) => m.docketwiseId === id);
                              if (mt) {
                                form.setValue("matterType", mt.name);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select matter type" />
                            </SelectTrigger>
                            <SelectContent>
                              {(matterTypesData || []).map((mt) => (
                                <SelectItem key={mt.docketwiseId} value={String(mt.docketwiseId)}>
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
                      name="statusId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="statusId">Status</FieldLabel>
                          <Select 
                            value={field.value ? String(field.value) : ""} 
                            onValueChange={(value) => {
                              const id = parseInt(value);
                              form.setValue("statusId", id);
                              const status = availableStatuses.find((s) => s.docketwiseId === id);
                              if (status) {
                                form.setValue("status", status.name);
                              }
                            }}
                            disabled={!selectedMatterTypeId}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={selectedMatterTypeId ? "Select status" : "Select type first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableStatuses.map((status) => (
                                <SelectItem key={status.docketwiseId} value={String(status.docketwiseId)}>
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

                  {/* Priority Date */}
                  <Controller
                    name="priorityDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="priorityDate">Priority Date</FieldLabel>
                        <Input
                          type="date"
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          placeholder="Select priority date"
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

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
                  {/* Team Member and Assigned Date - side by side on desktop */}
                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    <Controller
                      name="teamId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="teamId">Team Member</FieldLabel>
                          <AdvancedSelect
                            options={teamOptions}
                            value={field.value ? String(field.value) : ""}
                            onChange={(value) => {
                              const id = parseInt(value);
                              form.setValue("teamId", id);
                              const team = teams.find((t) => t.docketwiseId === id);
                              if (team) {
                                form.setValue("assignees", team.fullName || team.email);
                              }
                            }}
                            placeholder="Select team member"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="assignedDate"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="assignedDate">Assigned Date</FieldLabel>
                          <Input
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            placeholder="Select assignment date"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldGroup>
              </div>
            )}

            {/* Step 3: Billing & Deadlines */}
            {currentStep === 3 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Billing & Deadlines</h2>
                  <p className="text-sm text-muted-foreground">
                    Set billing information and important deadlines
                  </p>
                </div>

                <FieldGroup>
                  {/* Billing Status */}
                  <Controller
                    name="billingStatus"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="billingStatus">Billing Status</FieldLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select billing status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                            <SelectItem value="PAYMENT_PLAN">Payment Plan</SelectItem>
                            <SelectItem value="DUE">Due</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {/* Total Hours & Flat Fee */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="totalHours"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="totalHours">Total Hours</FieldLabel>
                          <Input
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            id="totalHours"
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="e.g., 10.5"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="flatFee"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="flatFee">Flat Fee ($)</FieldLabel>
                          <Input
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            id="flatFee"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 2500.00"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Deadlines */}
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="estimatedDeadline"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="estimatedDeadline">Estimated Deadline</FieldLabel>
                          <Input
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            placeholder="Select estimated deadline"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      name="actualDeadline"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="actualDeadline">Actual Deadline</FieldLabel>
                          <Input
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            placeholder="Select actual deadline"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  {/* Custom Notes */}
                  <Controller
                    name="customNotes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="customNotes">Custom Notes</FieldLabel>
                        <Textarea
                          {...field}
                          id="customNotes"
                          placeholder="Add any relevant notes about this matter..."
                          rows={4}
                        />
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
                disabled={currentStep === 1 || form.formState.isSubmitting}
              >
                <ChevronLeft />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={form.formState.isSubmitting}
                >
                  Next
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Creating..." : "Create Matter"}
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
