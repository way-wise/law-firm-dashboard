import * as z from "zod";

// Use z.any() for nested objects to accept any structure from Docketwise
// Note: In Docketwise API, this is the "users" endpoint, but we display as "Team" in UI

// Main User/Team Member schema - only validate required fields, accept everything else
export const teamMemberSchema = z
  .object({
    id: z.number(),
    email: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .and(z.record(z.string(), z.unknown()));

export type TeamMemberSchemaType = {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  active?: boolean;
  phone?: string | null;
  avatar_url?: string | null;
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
export const paginatedTeamSchema = z.object({
  data: z.array(z.any()),
  pagination: z.any().optional(),
  connectionError: z.boolean().optional(),
});
export type PaginatedTeamSchemaType = {
  data: TeamMemberSchemaType[];
  pagination?: DocketwisePaginationSchemaType;
  connectionError?: boolean;
};

// Filter schema for team
export const teamFilterSchema = z.object({
  page: z.number().optional(),
  active: z.boolean().optional(),
});
export type TeamFilterSchemaType = z.infer<typeof teamFilterSchema>;

// Input schema for creating/updating team members
export const teamMemberInputSchema = z.object({
  email: z.string().email("Valid email is required"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
});
export type TeamMemberInputSchemaType = z.infer<typeof teamMemberInputSchema>;
