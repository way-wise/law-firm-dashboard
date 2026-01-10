import * as z from "zod";

// Use z.any() for nested objects to accept any structure from Docketwise
export const addressSchema = z.any();
export type AddressSchemaType = {
  id?: number;
  street_number_and_name?: string;
  apartment_number?: string;
  city?: string;
  state?: string;
  county?: string;
  province?: string;
  zip_code?: string;
  country?: string;
  physical?: boolean;
  mailing?: boolean;
  [key: string]: unknown;
};

export const phoneNumberSchema = z.any();
export type PhoneNumberSchemaType = {
  id?: number;
  number?: string;
  daytime?: boolean;
  [key: string]: unknown;
};

// Main Contact schema - only validate required fields, accept everything else
export const contactSchema = z
  .object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .and(z.record(z.string(), z.unknown()));

export type ContactSchemaType = {
  id: number;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  middle_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  type?: "Person" | "Institution";
  lead?: boolean;
  lead_phone?: string | null;
  physical_address?: AddressSchemaType;
  mailing_address?: AddressSchemaType;
  phone_numbers?: PhoneNumberSchemaType[];
  addresses?: AddressSchemaType[];
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
export const paginatedContactsSchema = z.object({
  data: z.array(z.any()),
  pagination: z.any().optional(),
  connectionError: z.boolean().optional(),
});
export type PaginatedContactsSchemaType = {
  data: ContactSchemaType[];
  pagination?: DocketwisePaginationSchemaType;
  connectionError?: boolean;
};

// Filter schema for contacts
export const contactFilterSchema = z.object({
  page: z.number().optional(),
  type: z.enum(["Person", "Institution"]).optional(),
  filter: z.enum(["all"]).optional(),
});
export type ContactFilterSchemaType = z.infer<typeof contactFilterSchema>;

// Input schema for creating/updating contacts
export const contactInputSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(["Person", "Institution"]).optional(),
  lead: z.boolean().optional(),
  addresses_attributes: z
    .array(
      z.object({
        street_number_and_name: z.string().optional(),
        apartment_number: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        province: z.string().optional(),
        zip_code: z.string().optional(),
        physical: z.boolean().optional(),
        mailing: z.boolean().optional(),
      }),
    )
    .optional(),
  phone_numbers_attributes: z
    .array(
      z.object({
        number: z.string().optional(),
        daytime: z.boolean().optional(),
      }),
    )
    .optional(),
});
export type ContactInputSchemaType = z.infer<typeof contactInputSchema>;
