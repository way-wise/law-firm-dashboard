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
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, DollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const chargeSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Amount must be a number greater than or equal to 0"
  ),
  status: z.enum(["service", "expense", "fee"]),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  invoice_id: z.string().min(1, "Invoice ID is required"),
  matter_id: z.string().optional(),
  client_id: z.string().optional(),
});

type ChargeInput = z.infer<typeof chargeSchema>;

const NewChargeForm = () => {
  const router = useRouter();

  const form = useForm<ChargeInput>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      amount: "0.00",
      status: "service",
      date: new Date().toISOString().split("T")[0],
      description: "",
      invoice_id: "",
      matter_id: "",
      client_id: "",
    },
  });

  const onSubmit = async (data: ChargeInput) => {
    console.log("New charge:", data);
    // TODO: API call - POST /invoices/:invoice_id/charges
    // await fetch(`/api/invoices/${data.invoice_id}/charges`, {
    //   method: "POST",
    //   body: JSON.stringify({ charge: data }),
    // });
    router.push("/dashboard/charges");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/charges">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add Charge</h1>
          <p className="text-muted-foreground">Create a new charge for an invoice</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
          <FieldSet disabled={form.formState.isSubmitting}>
            <FieldGroup>
              <FieldGroup className="grid sm:grid-cols-2">
                <Controller
                  name="invoice_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="invoice_id">
                        Invoice ID <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="invoice_id"
                        type="number"
                        placeholder="Enter invoice ID"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
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
              </FieldGroup>

              <FieldGroup className="grid sm:grid-cols-2">
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
              </FieldGroup>

              <FieldGroup className="grid sm:grid-cols-2">
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
                <Controller
                  name="client_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="client_id">Client ID</FieldLabel>
                      <Input
                        {...field}
                        id="client_id"
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
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/charges">Cancel</Link>
              </Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                <DollarSign className="mr-2 size-4" />
                Create Charge
              </Button>
            </div>
          </FieldSet>
        </form>
      </div>
    </div>
  );
};

export default NewChargeForm;

