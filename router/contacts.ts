import { getDocketwiseToken } from "@/lib/docketwise";
import { authorized } from "@/lib/orpc";
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

// Get Contacts
export const getContacts = authorized
  .route({
    method: "GET",
    path: "/contacts",
    summary: "Get all contacts from Docketwise",
    tags: ["Contacts"],
  })
  .input(contactFilterSchema)
  .output(paginatedContactsSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      return {
        data: [],
        pagination: undefined,
        connectionError: true,
      };
    }

    try {
      const params = new URLSearchParams();
      if (input.page) params.append("page", input.page.toString());
      if (input.type) params.append("type", input.type);
      if (input.filter) params.append("filter", input.filter);

      const queryString = params.toString();
      const endpoint = `/contacts${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(`${DOCKETWISE_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Docketwise API Error:",
          response.status,
          await response.text(),
        );

        if (response.status >= 400 && response.status < 500) {
          return {
            data: [],
            pagination: undefined,
            connectionError: true,
          };
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Docketwise API error: ${response.status}`,
        });
      }

      const paginationHeader = response.headers.get("X-Pagination");
      const data = await response.json();

      const pagination = paginationHeader
        ? JSON.parse(paginationHeader)
        : undefined;

      return {
        data: Array.isArray(data) ? data : data.data || data,
        pagination,
      };
    } catch (error) {
      console.error("Docketwise API Error:", error);

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to fetch contacts",
      });
    }
  });

// Get Contact by ID
export const getContactById = authorized
  .route({
    method: "GET",
    path: "/contacts/:id",
    summary: "Get a single contact by ID",
    tags: ["Contacts"],
  })
  .input(z.object({ id: z.number() }))
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
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new ORPCError("NOT_FOUND", {
          message: `Contact not found: ${response.status}`,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to fetch contact",
      });
    }
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
    path: "/contacts/:id",
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
    path: "/contacts/:id",
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
