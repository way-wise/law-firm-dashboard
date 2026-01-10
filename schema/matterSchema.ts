import * as z from "zod";

// Use z.any() for nested objects to accept any structure from Docketwise
export const matterStatusSchema = z.any();
export type MatterStatusSchemaType = {
  id?: number;
  name?: string;
  [key: string]: unknown;
};

export const matterTypeSchema = z.any();
export type MatterTypeSchemaType = {
  id?: number;
  name?: string;
  [key: string]: unknown;
};

export const clientSchema = z.any();
export type ClientSchemaType = {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  [key: string]: unknown;
};

export const receiptSchema = z.any();
export type ReceiptSchemaType = {
  id?: number;
  number?: string;
  description?: string;
  status_update_type?: string;
  [key: string]: unknown;
};

export const noteSchema = z.any();
export type NoteSchemaType = {
  id?: number;
  title?: string;
  content?: string;
  starred?: boolean;
  created_by_name?: string;
  date?: string;
  [key: string]: unknown;
};

// Main Matter schema - only validate required fields, accept everything else
export const matterSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    client_id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .and(z.record(z.string(), z.unknown()));

export type MatterSchemaType = {
  id: number;
  title: string;
  client_id: number;
  created_at: string;
  updated_at: string;
  number?: string | null;
  client?: ClientSchemaType;
  status?: MatterStatusSchemaType | null;
  type?: MatterTypeSchemaType | null;
  receipts?: ReceiptSchemaType[];
  notes?: NoteSchemaType[];
  description?: string | null;
  receipt_number?: string | null;
  priority_date?: string | null;
  priority_date_status?: string;
  archived?: boolean;
  [key: string]: unknown;
};

// Docketwise pagination (from X-Pagination header)
export const docketwisePaginationSchema = z.object({
  total: z.number(),
  next_page: z.number().nullable(),
  previous_page: z.number().nullable(),
  total_pages: z.number(),
});
export type DocketwisePaginationSchemaType = z.infer<
  typeof docketwisePaginationSchema
>;

// Paginated response schema
export const paginatedMattersSchema = z.object({
  data: z.array(matterSchema),
  pagination: docketwisePaginationSchema.optional(),
  connectionError: z.boolean().optional(),
});
export type PaginatedMattersSchemaType = z.infer<typeof paginatedMattersSchema>;

// Filter schema for matters
export const matterFilterSchema = z.object({
  page: z.number().optional(),
  archived: z.boolean().optional(),
  client_id: z.number().optional(),
  search: z.string().optional(),
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
