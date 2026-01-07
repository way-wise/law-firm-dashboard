"use client";

import { getChargeById } from "@/data/charges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, getStatusVariant, getStatusLabel } from "@/data/charges";
import { format } from "date-fns";
import { ArrowLeft, DollarSign, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const chargeSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Amount must be a number greater than or equal to 0"
  ),
  status: z.enum(["service", "expense", "fee"]),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  matter_id: z.string().optional(),
});

type ChargeInput = z.infer<typeof chargeSchema>;

const ChargePage = () => {
  const router = useRouter();
  const params = useParams();
  const chargeId = Number(params.id);
  const charge = getChargeById(chargeId);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ChargeInput>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      amount: charge?.amount || "0.00",
      status: charge?.status || "service",
      date: charge?.date || new Date().toISOString().split("T")[0],
      description: charge?.description || "",
      matter_id: charge?.matter_id?.toString() || "",
    },
  });

  useEffect(() => {
    if (charge) {
      form.reset({
        amount: charge.amount,
        status: charge.status,
        date: charge.date,
        description: charge.description || "",
        matter_id: charge.matter_id?.toString() || "",
      });
    }
  }, [charge, form]);

  const onSubmit = async (data: ChargeInput) => {
    console.log("Charge data:", data);
    // TODO: API call - PUT /charges/:id
    setIsEditing(false);
  };

  if (!charge) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-muted-foreground">Charge not found</p>
        <Button asChild>
          <Link href="/dashboard/charges">
            <ArrowLeft className="mr-2 size-4" />
            Back to Charges
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/charges">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Edit Charge" : "Charge Details"}
            </h1>
            <p className="text-muted-foreground">Invoice #{charge.invoice_id}</p>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
        )}
      </div>

      {/* Charge Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          {isEditing ? (
            <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
              <FieldSet disabled={form.formState.isSubmitting}>
                <FieldGroup>
                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="amount"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="amount">
                            Amount <span className="text-destructive">*</span>
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupAddon>
                              <DollarSign />
                            </InputGroupAddon>
                            <Input
                              {...field}
                              id="amount"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                          </InputGroup>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="status"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="status">
                            Status <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="fee">Fee</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup className="grid sm:grid-cols-2">
                    <Controller
                      name="date"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="date">
                            Date <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} id="date" type="date" />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="matter_id"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="matter_id">Matter ID</FieldLabel>
                          <Input
                            {...field}
                            id="matter_id"
                            type="number"
                            placeholder="Optional"
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="description">Description</FieldLabel>
                        <Textarea
                          {...field}
                          id="description"
                          placeholder="Enter charge description..."
                          rows={4}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={form.formState.isSubmitting}>
                    Save Changes
                  </Button>
                </div>
              </FieldSet>
            </form>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">Charge Information</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="text-sm">{charge.description || "No description"}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(charge.amount)}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge variant={getStatusVariant(charge.status)}>
                    {getStatusLabel(charge.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
                    <p className="text-sm">
                      {format(new Date(charge.date), "PP")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Invoice ID</h3>
                    <p className="text-sm">#{charge.invoice_id}</p>
                  </div>
                </div>
                {charge.matter_id && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Matter ID</h3>
                    <p className="text-sm">#{charge.matter_id}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Contact ID</h3>
                  <p className="text-sm">#{charge.contact_id}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                  <p className="text-sm">
                    {format(new Date(charge.created_at), "PPpp")}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                  <p className="text-sm">
                    {format(new Date(charge.updated_at), "PPpp")}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Summary Card */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Amount</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(charge.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={getStatusVariant(charge.status)}>
                {getStatusLabel(charge.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Invoice</span>
              <span className="text-sm font-mono">#{charge.invoice_id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargePage;

