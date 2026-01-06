"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  getInvoiceStatusVariant,
  type Invoice,
  invoices,
} from "@/data/invoices";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowLeft,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const invoiceSchema = z.object({
  client_name: z.string().min(1, "Client is required"),
  matter_title: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  subtotal: z.string().min(1, "Amount is required"),
  notes: z.string().optional(),
});

type InvoiceInput = z.infer<typeof invoiceSchema>;

const InvoicesTable = () => {
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_name: "",
      matter_title: "",
      status: "draft",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      subtotal: "",
      notes: "",
    },
  });

  const onSubmit = async (data: InvoiceInput) => {
    console.log("New invoice:", data);
    // TODO: API call
    setOpenAddDialog(false);
    form.reset();
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      header: "Invoice #",
      accessorKey: "invoice_number",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.invoice_number}</span>
      ),
    },
    {
      header: "Client",
      accessorKey: "client_name",
    },
    {
      header: "Matter",
      accessorKey: "matter_title",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.matter_title || "—"}
        </span>
      ),
    },
    {
      header: "Amount",
      accessorKey: "total",
      cell: ({ row }) => formatCurrency(row.original.total),
    },
    {
      header: "Balance Due",
      accessorKey: "balance_due",
      cell: ({ row }) => (
        <span className={row.original.balance_due > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
          {formatCurrency(row.original.balance_due)}
        </span>
      ),
    },
    {
      header: "Due Date",
      accessorKey: "due_date",
      cell: ({ row }) => format(new Date(row.original.due_date), "MMM d, yyyy"),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge variant={getInvoiceStatusVariant(row.original.status)}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedInvoice(row.original);
                setOpenViewDialog(true);
              }}
            >
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold">Invoices</h1>
          </div>
          <Button onClick={() => setOpenAddDialog(true)}>
            <Plus />
            New Invoice
          </Button>
        </div>

        {/* Card with search and table */}
        <div className="rounded-xl border bg-card pb-6">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-4 p-6">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable columns={columns} data={invoices} />
        </div>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedInvoice.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Matter</p>
                  <p className="font-medium">{selectedInvoice.matter_title || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedInvoice.issue_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedInvoice.due_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getInvoiceStatusVariant(selectedInvoice.status)}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="mb-2 text-sm font-medium">Line Items</p>
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 text-right font-medium">Rate</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.line_items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Balance Due</span>
                    <span className={selectedInvoice.balance_due > 0 ? "text-destructive" : ""}>
                      {formatCurrency(selectedInvoice.balance_due)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Invoice Dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a client
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
            <FieldSet disabled={form.formState.isSubmitting}>
              <FieldGroup>
                <Controller
                  name="client_name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="client_name">
                        Client <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input {...field} id="client_name" placeholder="Client name" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  name="matter_title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="matter_title">Matter</FieldLabel>
                      <Input {...field} id="matter_title" placeholder="Associated matter (optional)" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <FieldGroup className="grid sm:grid-cols-2">
                  <Controller
                    name="issue_date"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="issue_date">
                          Issue Date <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="issue_date" type="date" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    name="due_date"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="due_date">
                          Due Date <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="due_date" type="date" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <FieldGroup className="grid sm:grid-cols-2">
                  <Controller
                    name="subtotal"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="subtotal">
                          Amount <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} id="subtotal" type="number" placeholder="0.00" />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="status">Status</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <Controller
                  name="notes"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="notes">Notes</FieldLabel>
                      <Textarea {...field} id="notes" placeholder="Invoice notes..." rows={3} />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={form.formState.isSubmitting}>
                  Create Invoice
                </Button>
              </div>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoicesTable;
