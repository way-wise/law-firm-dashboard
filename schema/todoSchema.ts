import * as z from "zod";
import { paginationSchema } from "./paginationSchema";

// Todo schema
export const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["pending", "completed"]),
  dueTime: z.date().nullish(),
  description: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TodoSchemaType = z.infer<typeof todoSchema>;

// Input schema
export const todoInputSchema = z.object({
  title: z.string().nonempty("Title is required"),
  status: z.enum(["pending", "completed"]).optional(),
  dueTime: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val).toISOString() : undefined)),
  description: z.string().optional(),
});
export type TodoInputSchemaType = z.infer<typeof todoInputSchema>;

// Filter schema
export const todoFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["pending", "completed"]).optional(),
  dueTime: z.date().optional(),
  ...paginationSchema.shape,
});
export type TodoFilterSchemaType = z.infer<typeof todoFilterSchema>;
