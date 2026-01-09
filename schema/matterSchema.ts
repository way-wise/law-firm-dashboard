import * as z from "zod";
import { paginationSchema } from "./paginationSchema";

// Matter Status schema
export const matterStatusSchema = z.object({
  id: z.number(),
  name: z.string(),
  duration: z.number().nullable(),
  sort: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MatterStatusSchemaType = z.infer<typeof matterStatusSchema>;

// Matter Type schema
export const matterTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
  matter_statuses: z.array(matterStatusSchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MatterTypeSchemaType = z.infer<typeof matterTypeSchema>;

// Client schema (embedded in matter)
export const clientSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().nullable(),
  company_name: z.string().nullable(),
  email: z.string().nullable(),
  lead: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ClientSchemaType = z.infer<typeof clientSchema>;

// Receipt schema
export const receiptSchema = z.object({
  id: z.number(),
  number: z.string(),
  description: z.string().nullable(),
  status_update_type: z.enum(["manual", "automatic"]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ReceiptSchemaType = z.infer<typeof receiptSchema>;

// Note schema
export const noteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  date: z.string(),
  starred: z.boolean(),
  created_by_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NoteSchemaType = z.infer<typeof noteSchema>;

// Main Matter schema
export const matterSchema = z.object({
  id: z.number(),
  number: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  client_id: z.number(),
  attorney_id: z.number().nullable(),
  user_ids: z.array(z.number()),
  status: matterStatusSchema.nullable(),
  type: matterTypeSchema.nullable(),
  receipt_number: z.string().nullable(),
  priority_date: z.string().nullable(),
  priority_date_status: z.enum(["undefined", "current", "not_current"]),
  archived: z.boolean(),
  discarded_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  client: clientSchema.optional(),
  receipts: z.array(receiptSchema).optional(),
  notes: z.array(noteSchema).optional(),
});
export type MatterSchemaType = z.infer<typeof matterSchema>;

// Pagination metadata schema
export const paginationMetaSchema = z.object({
  total: z.number(),
  next_page: z.number().nullable(),
  previous_page: z.number().nullable(),
  total_pages: z.number(),
});
export type PaginationMetaSchemaType = z.infer<typeof paginationMetaSchema>;

// Paginated response schema
export const paginatedMattersSchema = z.object({
  data: z.array(matterSchema),
  pagination: paginationMetaSchema.optional(),
  connectionError: z.boolean().optional(),
});
export type PaginatedMattersSchemaType = z.infer<typeof paginatedMattersSchema>;

// Filter schema for matters
export const matterFilterSchema = z.object({
  archived: z.boolean().optional(),
  client_id: z.number().optional(),
  search: z.string().optional(),
  ...paginationSchema.shape,
});
export type MatterFilterSchemaType = z.infer<typeof matterFilterSchema>;

// Input schema for creating/updating matters
export const matterInputSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  client_id: z.number(),
  user_ids: z.array(z.number()).optional(),
});
export type MatterInputSchemaType = z.infer<typeof matterInputSchema>;
