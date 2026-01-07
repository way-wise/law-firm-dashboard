// Charge interface aligned with Docketwise API
export interface Charge {
  id: number;
  matter_id: number | null;
  invoice_id: number;
  contact_id: number;
  firm_id: number;
  user_id: number;
  description: string | null;
  amount: string; // Decimal as string
  status: "service" | "expense" | "fee";
  created_at: string;
  updated_at: string;
  created_by_migration: string | null;
  date: string;
}

// Helper to format currency
export const formatCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
};

// Helper to get status badge variant
export const getStatusVariant = (
  status: "service" | "expense" | "fee"
): "default" | "secondary" | "outline" => {
  switch (status) {
    case "service":
      return "default";
    case "expense":
      return "secondary";
    case "fee":
      return "outline";
    default:
      return "default";
  }
};

// Helper to get status label
export const getStatusLabel = (status: "service" | "expense" | "fee"): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

// Mock charges data
export const charges: Charge[] = [
  {
    id: 1,
    matter_id: null,
    invoice_id: 1,
    contact_id: 1,
    firm_id: 1,
    user_id: 2,
    description: "Initial consultation fee",
    amount: "500.00",
    status: "service",
    created_at: "2022-03-03T17:27:09.950Z",
    updated_at: "2022-03-03T17:27:10.164Z",
    created_by_migration: null,
    date: "2022-03-03",
  },
  {
    id: 2,
    matter_id: 1,
    invoice_id: 1,
    contact_id: 1,
    firm_id: 1,
    user_id: 2,
    description: "Document preparation and filing",
    amount: "1500.00",
    status: "service",
    created_at: "2022-01-12T15:35:32.586Z",
    updated_at: "2022-03-03T17:47:39.669Z",
    created_by_migration: null,
    date: "2022-01-12",
  },
  {
    id: 3,
    matter_id: 1,
    invoice_id: 2,
    contact_id: 2,
    firm_id: 1,
    user_id: 4,
    description: "USCIS filing fee",
    amount: "460.00",
    status: "expense",
    created_at: "2024-11-05T10:00:00.000Z",
    updated_at: "2024-11-05T10:00:00.000Z",
    created_by_migration: null,
    date: "2024-11-05",
  },
  {
    id: 4,
    matter_id: 2,
    invoice_id: 2,
    contact_id: 2,
    firm_id: 1,
    user_id: 4,
    description: "H-1B petition preparation",
    amount: "2500.00",
    status: "service",
    created_at: "2024-11-05T11:30:00.000Z",
    updated_at: "2024-11-05T11:30:00.000Z",
    created_by_migration: null,
    date: "2024-11-05",
  },
  {
    id: 5,
    matter_id: 3,
    invoice_id: 3,
    contact_id: 3,
    firm_id: 1,
    user_id: 2,
    description: "Translation services",
    amount: "300.00",
    status: "expense",
    created_at: "2024-11-10T09:15:00.000Z",
    updated_at: "2024-11-10T09:15:00.000Z",
    created_by_migration: null,
    date: "2024-11-10",
  },
  {
    id: 6,
    matter_id: 3,
    invoice_id: 3,
    contact_id: 3,
    firm_id: 1,
    user_id: 2,
    description: "Asylum application preparation",
    amount: "2000.00",
    status: "service",
    created_at: "2024-11-10T10:00:00.000Z",
    updated_at: "2024-11-10T10:00:00.000Z",
    created_by_migration: null,
    date: "2024-11-10",
  },
  {
    id: 7,
    matter_id: 4,
    invoice_id: 4,
    contact_id: 4,
    firm_id: 1,
    user_id: 3,
    description: "Premium processing fee",
    amount: "2500.00",
    status: "fee",
    created_at: "2024-11-15T14:20:00.000Z",
    updated_at: "2024-11-15T14:20:00.000Z",
    created_by_migration: null,
    date: "2024-11-15",
  },
  {
    id: 8,
    matter_id: 4,
    invoice_id: 4,
    contact_id: 4,
    firm_id: 1,
    user_id: 3,
    description: "L-1A petition preparation",
    amount: "3000.00",
    status: "service",
    created_at: "2024-11-15T15:00:00.000Z",
    updated_at: "2024-11-15T15:00:00.000Z",
    created_by_migration: null,
    date: "2024-11-15",
  },
  {
    id: 9,
    matter_id: 5,
    invoice_id: 5,
    contact_id: 5,
    firm_id: 1,
    user_id: 5,
    description: "Expert opinion letter",
    amount: "1500.00",
    status: "expense",
    created_at: "2024-11-20T13:30:00.000Z",
    updated_at: "2024-11-20T13:30:00.000Z",
    created_by_migration: null,
    date: "2024-11-20",
  },
  {
    id: 10,
    matter_id: 5,
    invoice_id: 5,
    contact_id: 5,
    firm_id: 1,
    user_id: 5,
    description: "EB-2 NIW petition preparation",
    amount: "3500.00",
    status: "service",
    created_at: "2024-11-20T14:00:00.000Z",
    updated_at: "2024-11-20T14:00:00.000Z",
    created_by_migration: null,
    date: "2024-11-20",
  },
  {
    id: 11,
    matter_id: 6,
    invoice_id: 6,
    contact_id: 6,
    firm_id: 1,
    user_id: 2,
    description: "O-1 petition preparation",
    amount: "4000.00",
    status: "service",
    created_at: "2024-11-25T16:00:00.000Z",
    updated_at: "2024-11-25T16:00:00.000Z",
    created_by_migration: null,
    date: "2024-11-25",
  },
  {
    id: 12,
    matter_id: 8,
    invoice_id: 7,
    contact_id: 8,
    firm_id: 1,
    user_id: 1,
    description: "RFE response preparation",
    amount: "1800.00",
    status: "service",
    created_at: "2024-12-10T10:00:00.000Z",
    updated_at: "2024-12-10T10:00:00.000Z",
    created_by_migration: null,
    date: "2024-12-10",
  },
];

// Get paginated charges
export function getCharges(
  page: number = 1,
  limit: number = 10,
  search?: string,
  invoiceId?: number,
  status?: "service" | "expense" | "fee"
) {
  let filtered = charges;

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (charge) =>
        charge.description?.toLowerCase().includes(searchLower) ||
        charge.amount.includes(search)
    );
  }

  // Filter by invoice ID
  if (invoiceId) {
    filtered = filtered.filter((charge) => charge.invoice_id === invoiceId);
  }

  // Filter by status
  if (status) {
    filtered = filtered.filter((charge) => charge.status === status);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const data = filtered.slice(start, end);

  return {
    data,
    meta: {
      page,
      limit,
      total: filtered.length,
    },
  };
}

// Get charge by ID
export const getChargeById = (id: number) => charges.find((c) => c.id === id);

// Get charges by invoice ID
export const getChargesByInvoiceId = (invoiceId: number) =>
  charges.filter((c) => c.invoice_id === invoiceId);

// Get charges by matter ID
export const getChargesByMatterId = (matterId: number) =>
  charges.filter((c) => c.matter_id === matterId);

// Calculate total amount for charges
export const calculateTotal = (charges: Charge[]): number => {
  return charges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
};

