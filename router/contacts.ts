import { getDocketwiseToken } from "@/lib/docketwise";
import { authorized } from "@/lib/orpc";
import prisma, { Prisma } from "@/lib/prisma";
import { getOrSetCache, CACHE_KEYS, DEFAULT_CACHE_TTL } from "@/lib/redis";
import {
  contactFilterSchema,
  contactInputSchema,
  contactSchema,
  paginatedContactsSchema,
  type ContactFilterSchemaType,
  type ContactSchemaType,
} from "@/schema/contactSchema";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

export type { ContactFilterSchemaType, ContactSchemaType };

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Get Contacts from synced database (NOT direct API)
export const getContacts = authorized
  .route({
    method: "GET",
    path: "/contacts",
    summary: "Get all contacts from synced database",
    tags: ["Contacts"],
  })
  .input(contactFilterSchema)
  .output(paginatedContactsSchema)
  .handler(async ({ input }) => {
    const page = input.page || 1;
    const perPage = 50;
    const cacheKey = `${CACHE_KEYS.CONTACTS_LIST}:${page}:${input.type ?? 'all'}`;

    return getOrSetCache(cacheKey, async () => {
      const where: Prisma.contactsWhereInput = {};
      
      if (input.type) {
        where.type = input.type;
      }

      const [contacts, total] = await Promise.all([
        prisma.contacts.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        }),
        prisma.contacts.count({ where }),
      ]);

      // Transform to match expected schema
      const data = contacts.map(contact => ({
        id: contact.docketwiseId,
        first_name: contact.firstName,
        last_name: contact.lastName,
        middle_name: contact.middleName,
        company_name: contact.companyName,
        email: contact.email,
        phone: contact.phone,
        type: contact.type,
        lead: contact.isLead,
        street_address: contact.streetAddress,
        apartment_number: contact.apartmentNumber,
        city: contact.city,
        state: contact.state,
        province: contact.province,
        zip_code: contact.zipCode,
        country: contact.country,
        created_at: contact.createdAt.toISOString(),
        updated_at: contact.updatedAt.toISOString(),
      }));

      return {
        data,
        pagination: total > perPage ? {
          total,
          next_page: page * perPage < total ? page + 1 : null,
          previous_page: page > 1 ? page - 1 : null,
          total_pages: Math.ceil(total / perPage),
        } : undefined,
      };
    }, DEFAULT_CACHE_TTL);
  });

// Get Contact by ID from database
export const getContactById = authorized
  .route({
    method: "GET",
    path: "/contacts/{id}",
    summary: "Get a single contact by ID from synced database",
    tags: ["Contacts"],
  })
  .input(z.object({ id: z.number() }))
  .output(contactSchema)
  .handler(async ({ input }) => {
    const contact = await prisma.contacts.findUnique({
      where: { docketwiseId: input.id },
    });

    if (!contact) {
      throw new ORPCError("NOT_FOUND", {
        message: `Contact not found: ${input.id}`,
      });
    }

    return {
      id: contact.docketwiseId,
      first_name: contact.firstName || "",
      last_name: contact.lastName || "",
      middle_name: contact.middleName,
      company_name: contact.companyName,
      email: contact.email,
      phone: contact.phone,
      type: contact.type,
      lead: contact.isLead,
      street_address: contact.streetAddress,
      apartment_number: contact.apartmentNumber,
      city: contact.city,
      state: contact.state,
      province: contact.province,
      zip_code: contact.zipCode,
      country: contact.country,
      created_at: contact.createdAt.toISOString(),
      updated_at: contact.updatedAt.toISOString(),
    };
  });

// Create Contact
export const createContact = authorized
  .route({
    method: "POST",
    path: "/contacts",
    summary: "Create a new contact",
    tags: ["Contacts"],
  })
  .input(contactInputSchema)
  .output(contactSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const response = await fetch(`${DOCKETWISE_API_URL}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contact: input }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Docketwise API Error:", response.status, errorText);
        throw new ORPCError("BAD_REQUEST", {
          message: `Failed to create contact: ${response.statusText}`,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to create contact",
      });
    }
  });

// Update Contact
export const updateContact = authorized
  .route({
    method: "PATCH",
    path: "/contacts/{id}",
    summary: "Update a contact",
    tags: ["Contacts"],
  })
  .input(
    z.object({
      id: z.number(),
      contact: contactInputSchema,
    }),
  )
  .output(contactSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const response = await fetch(
        `${DOCKETWISE_API_URL}/contacts/${input.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contact: input.contact }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Docketwise API Error:", response.status, errorText);
        throw new ORPCError("BAD_REQUEST", {
          message: `Failed to update contact: ${response.statusText}`,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to update contact",
      });
    }
  });

// Delete Contact
export const deleteContact = authorized
  .route({
    method: "DELETE",
    path: "/contacts/{id}",
    summary: "Delete a contact",
    tags: ["Contacts"],
  })
  .input(z.object({ id: z.number() }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const response = await fetch(
        `${DOCKETWISE_API_URL}/contacts/${input.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Docketwise API Error:", response.status, errorText);
        throw new ORPCError("BAD_REQUEST", {
          message: `Failed to delete contact: ${response.statusText}`,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to delete contact",
      });
    }
  });

// Document schema for Docketwise documents
const documentSchema = z.object({
  id: z.number(),
  title: z.string(),
  firm_id: z.number().optional(),
  client_id: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  archived: z.boolean().optional(),
  size: z.number().optional(),
  user_id: z.number().optional(),
  uploaded_by_email: z.string().nullable().optional(),
  doc_url: z.string().optional(),
});

// Get Contact Documents (on-demand fetch from Docketwise)
export const getContactDocuments = authorized
  .route({
    method: "GET",
    path: "/contacts/{clientId}/documents",
    summary: "Get documents for a specific contact/client",
    tags: ["Contacts", "Documents"],
  })
  .input(z.object({ clientId: z.number(), search: z.string().optional() }))
  .output(z.object({ data: z.array(documentSchema) }))
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const params = new URLSearchParams();
      params.append("client_id", input.clientId.toString());
      if (input.search) params.append("search", input.search);

      const response = await fetch(
        `${DOCKETWISE_API_URL}/documents?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.error("Docketwise API Error:", response.status);
        return { data: [] };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data : [] };
    } catch (error) {
      console.error("Docketwise API Error:", error);
      return { data: [] };
    }
  });
