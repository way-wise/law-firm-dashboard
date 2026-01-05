import * as z from "zod";

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(10).max(100).default(10),
});
export type PaginationSchemaType = z.infer<typeof paginationSchema>;

// Meta schema for paginated responses
export const metaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

// Generic paginated output schema
export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: metaSchema,
  });
}
