// Docketwise API aligned Invoice types

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  matter_id: number | null;
  matter_title: string | null;
  client_id: number;
  client_name: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

// Sample invoices data
export const invoices: Invoice[] = [
  {
    id: 1,
    invoice_number: "INV-2024-001",
    matter_id: 1,
    matter_title: "Maria Rodriguez - I-485",
    client_id: 1,
    client_name: "Maria Rodriguez",
    status: "paid",
    issue_date: "2024-01-15",
    due_date: "2024-02-15",
    subtotal: 3500,
    tax_rate: 0,
    tax_amount: 0,
    total: 3500,
    amount_paid: 3500,
    balance_due: 0,
    notes: "Initial retainer for I-485 application",
    line_items: [
      { id: 1, description: "I-485 Filing Fee", quantity: 1, rate: 1225, amount: 1225 },
      { id: 2, description: "Legal Services - Initial Consultation", quantity: 2, rate: 350, amount: 700 },
      { id: 3, description: "Document Preparation", quantity: 1, rate: 1575, amount: 1575 },
    ],
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-02-10T14:30:00Z",
  },
  {
    id: 2,
    invoice_number: "INV-2024-002",
    matter_id: 2,
    matter_title: "Chen Wei - H-1B",
    client_id: 2,
    client_name: "Chen Wei",
    status: "sent",
    issue_date: "2024-02-01",
    due_date: "2024-03-01",
    subtotal: 4500,
    tax_rate: 0,
    tax_amount: 0,
    total: 4500,
    amount_paid: 2000,
    balance_due: 2500,
    notes: "H-1B petition services",
    line_items: [
      { id: 1, description: "H-1B Filing Fee", quantity: 1, rate: 1710, amount: 1710 },
      { id: 2, description: "Premium Processing Fee", quantity: 1, rate: 2805, amount: 2805 },
      { id: 3, description: "Legal Services", quantity: 1, rate: -15, amount: -15 },
    ],
    created_at: "2024-02-01T09:00:00Z",
    updated_at: "2024-02-15T11:00:00Z",
  },
  {
    id: 3,
    invoice_number: "INV-2024-003",
    matter_id: 3,
    matter_title: "Ahmed Hassan - Asylum",
    client_id: 3,
    client_name: "Ahmed Hassan",
    status: "overdue",
    issue_date: "2024-01-20",
    due_date: "2024-02-20",
    subtotal: 5000,
    tax_rate: 0,
    tax_amount: 0,
    total: 5000,
    amount_paid: 1000,
    balance_due: 4000,
    notes: "Asylum application - payment plan",
    line_items: [
      { id: 1, description: "Asylum Application Preparation", quantity: 1, rate: 3500, amount: 3500 },
      { id: 2, description: "Interview Preparation", quantity: 3, rate: 500, amount: 1500 },
    ],
    created_at: "2024-01-20T14:00:00Z",
    updated_at: "2024-02-25T09:00:00Z",
  },
  {
    id: 4,
    invoice_number: "INV-2024-004",
    matter_id: 4,
    matter_title: "Priya Sharma - L-1",
    client_id: 4,
    client_name: "Priya Sharma",
    status: "draft",
    issue_date: "2024-03-01",
    due_date: "2024-04-01",
    subtotal: 6000,
    tax_rate: 0,
    tax_amount: 0,
    total: 6000,
    amount_paid: 0,
    balance_due: 6000,
    notes: "L-1 intracompany transfer",
    line_items: [
      { id: 1, description: "L-1 Petition Preparation", quantity: 1, rate: 4000, amount: 4000 },
      { id: 2, description: "Filing Fees", quantity: 1, rate: 2000, amount: 2000 },
    ],
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
  },
  {
    id: 5,
    invoice_number: "INV-2024-005",
    matter_id: 5,
    matter_title: "Dimitri Volkov - EB-2 NIW",
    client_id: 5,
    client_name: "Dimitri Volkov",
    status: "paid",
    issue_date: "2024-02-10",
    due_date: "2024-03-10",
    subtotal: 8500,
    tax_rate: 0,
    tax_amount: 0,
    total: 8500,
    amount_paid: 8500,
    balance_due: 0,
    notes: "EB-2 NIW petition - full payment received",
    line_items: [
      { id: 1, description: "EB-2 NIW Petition", quantity: 1, rate: 7000, amount: 7000 },
      { id: 2, description: "USCIS Filing Fee", quantity: 1, rate: 1500, amount: 1500 },
    ],
    created_at: "2024-02-10T11:00:00Z",
    updated_at: "2024-03-05T16:00:00Z",
  },
  {
    id: 6,
    invoice_number: "INV-2024-006",
    matter_id: null,
    matter_title: null,
    client_id: 6,
    client_name: "Sofia Martinez",
    status: "sent",
    issue_date: "2024-03-05",
    due_date: "2024-04-05",
    subtotal: 500,
    tax_rate: 0,
    tax_amount: 0,
    total: 500,
    amount_paid: 0,
    balance_due: 500,
    notes: "Initial consultation fee",
    line_items: [
      { id: 1, description: "Legal Consultation (1 hour)", quantity: 1, rate: 500, amount: 500 },
    ],
    created_at: "2024-03-05T09:00:00Z",
    updated_at: "2024-03-05T09:00:00Z",
  },
];

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Helper function to get status badge variant
export const getInvoiceStatusVariant = (status: InvoiceStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
      return "secondary";
    case "overdue":
      return "destructive";
    case "draft":
    case "cancelled":
      return "outline";
    default:
      return "outline";
  }
};
