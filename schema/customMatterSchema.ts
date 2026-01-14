import * as z from "zod";

export const billingStatusEnum = z.enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"]);

export const customMatterFieldsSchema = z.object({
  assignedDate: z.date().nullable(),
  estimatedDeadline: z.date().nullable(),
  actualDeadline: z.date().nullable(),
  billingStatus: billingStatusEnum.nullable(),
  paralegalAssigned: z.string().nullable(),
  customNotes: z.string().nullable(),
});

export const matterSchema = z.object({
  id: z.string(),
  docketwiseId: z.number(),
  docketwiseUpdatedAt: z.date().nullable(),
  title: z.string(),
  matterType: z.string().nullable(),
  matterTypeId: z.number().nullable(),
  workflowStage: z.string().nullable(),
  workflowStageId: z.number().nullable(),
  clientName: z.string().nullable(),
  clientId: z.number().nullable(),
  status: z.string().nullable(),
  statusId: z.number().nullable(),
  openedAt: z.date().nullable(),
  closedAt: z.date().nullable(),
  assignedDate: z.date().nullable(),
  estimatedDeadline: z.date().nullable(),
  actualDeadline: z.date().nullable(),
  billingStatus: billingStatusEnum.nullable(),
  paralegalAssigned: z.string().nullable(),
  customNotes: z.string().nullable(),
  lastSyncedAt: z.date(),
  isStale: z.boolean(),
  isEdited: z.boolean(),
  editedBy: z.string().nullable(),
  editedAt: z.date().nullable(),
  editedByUser: z.object({
    name: z.string(),
    email: z.string(),
  }).nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const updateCustomMatterFieldsSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  matterType: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  workflowStage: z.string().nullable().optional(),
  assignedDate: z.date().nullable().optional(),
  estimatedDeadline: z.date().nullable().optional(),
  actualDeadline: z.date().nullable().optional(),
  billingStatus: billingStatusEnum.nullable().optional(),
  paralegalAssigned: z.string().nullable().optional(),
  customNotes: z.string().nullable().optional(),
});

export const matterFilterSchema = z.object({
  page: z.number().optional(),
  search: z.string().optional(),
  billingStatus: billingStatusEnum.optional(),
  paralegalAssigned: z.string().optional(),
  isStale: z.boolean().optional(),
  hasDeadline: z.boolean().optional(),
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
