import * as z from "zod";

export const billingStatusEnum = z.enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"]);

// Helper for nullable coerced dates (handles both Date objects and ISO strings from Redis)
// Important: null/undefined/empty values should remain null, not coerce to epoch time
const coercedDateNullable = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '' || val === 0) return null;
    return val;
  },
  z.union([z.coerce.date(), z.null()])
);

export const customMatterFieldsSchema = z.object({
  assignedDate: coercedDateNullable,
  estimatedDeadline: coercedDateNullable,
  actualDeadline: coercedDateNullable,
  billingStatus: billingStatusEnum.nullable(),
  totalHours: z.number().nullable(),
  customNotes: z.string().nullable(),
});

export const matterSchema = z.object({
  id: z.string(),
  docketwiseId: z.number(),
  docketwiseCreatedAt: coercedDateNullable,
  docketwiseUpdatedAt: coercedDateNullable,
  title: z.string(),
  description: z.string().nullable(),
  matterType: z.string().nullable(),
  matterTypeId: z.number().nullable(),
  status: z.string().nullable(),           // Workflow stage (renamed from workflowStage)
  statusId: z.number().nullable(),
  statusForFiling: z.string().nullable(),  // Status for filing (renamed from status)
  statusForFilingId: z.number().nullable(),
  clientName: z.string().nullable(),
  clientId: z.number().nullable(),
  teamId: z.number().nullable(),
  assignee: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    fullName: z.string(),
    teamType: z.string(),
    title: z.string().nullable(),
    isActive: z.boolean(),
  }).nullable(),
  assignees: z.string().nullable(),        // Comma-separated assignee names (renamed from paralegalAssigned)
  docketwiseUserIds: z.string().nullable(),
  openedAt: coercedDateNullable,
  closedAt: coercedDateNullable,
  assignedDate: coercedDateNullable,
  estimatedDeadline: coercedDateNullable,
  actualDeadline: coercedDateNullable,
  billingStatus: billingStatusEnum.nullable(),
  totalHours: z.number().nullable(),
  flatFee: z.number().nullable(),
  customNotes: z.string().nullable(),
  lastSyncedAt: z.coerce.date(),
  isStale: z.boolean(),
  isEdited: z.boolean(),
  editedBy: z.string().nullable(),
  editedAt: coercedDateNullable,
  editedByUser: z.object({
    name: z.string(),
    email: z.string(),
  }).nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Dynamic deadline calculation fields
  calculatedDeadline: coercedDateNullable.optional(),
  isPastEstimatedDeadline: z.boolean().optional(),
  totalHoursElapsed: z.number().optional(),
  // Notes from Docketwise API
  notes: z.array(z.object({
    id: z.number(),
    title: z.string().nullable(),
    content: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by_name: z.string().nullable().optional(),
  })).nullable().optional(),
});

export const updateCustomMatterFieldsSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  matterType: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  status: z.string().nullable().optional(),           // Workflow stage
  statusForFiling: z.string().nullable().optional(),  // Status for filing
  assignees: z.string().nullable().optional(),
  teamId: z.number().nullable().optional(),
  assignedDate: z.date().nullable().optional(),
  estimatedDeadline: z.date().nullable().optional(),
  actualDeadline: z.date().nullable().optional(),
  billingStatus: billingStatusEnum.nullable().optional(),
  totalHours: z.number().nullable().optional(),
  flatFee: z.number().nullable().optional(),
  customNotes: z.string().nullable().optional(),
});

export const matterFilterSchema = z.object({
  page: z.number().optional(),
  search: z.string().optional(),
  billingStatus: billingStatusEnum.optional(),
  assignees: z.string().optional(),
  matterType: z.string().optional(),
  status: z.string().optional(),
  isStale: z.boolean().optional(),
  hasDeadline: z.boolean().optional(),
  dateFrom: z.string().optional(), // ISO date string for docketwiseCreatedAt filter
  dateTo: z.string().optional(), // ISO date string for docketwiseCreatedAt filter
});

export const paginatedMattersSchema = z.object({
  data: z.array(matterSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
    totalPages: z.number(),
  }).nullable(),
});

export type BillingStatusType = z.infer<typeof billingStatusEnum>;
export type CustomMatterFieldsType = z.infer<typeof customMatterFieldsSchema>;
export type MatterType = z.infer<typeof matterSchema>;
export type UpdateCustomMatterFieldsType = z.infer<typeof updateCustomMatterFieldsSchema>;
export type MatterFilterType = z.infer<typeof matterFilterSchema>;
export type PaginatedMattersType = z.infer<typeof paginatedMattersSchema>;
