import { getDocketwiseToken } from "@/lib/docketwise";
import { authorized } from "@/lib/orpc";
import {
  matterFilterSchema,
  matterInputSchema,
  matterSchema,
  paginatedMattersSchema,
  receiptSchema,
  type MatterFilterSchemaType,
  type MatterSchemaType,
} from "@/schema/matterSchema";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

export type { MatterFilterSchemaType, MatterSchemaType };

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Get Matters
export const getMatters = authorized
  .route({
    method: "GET",
    path: "/matters",
    summary: "Get all matters from Docketwise",
    tags: ["Matters"],
  })
  .input(matterFilterSchema)
  .output(paginatedMattersSchema)
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
      if (input.archived !== undefined)
        params.append("archived", input.archived.toString());
      if (input.client_id)
        params.append("client_id", input.client_id.toString());

      const queryString = params.toString();
      const endpoint = `/matters${queryString ? `?${queryString}` : ""}`;

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

      if (Array.isArray(data)) {
        return {
          data,
          pagination: undefined,
        };
      }

      return {
        data: data.data || data,
        pagination: paginationHeader
          ? JSON.parse(paginationHeader)
          : data.pagination,
      };
    } catch (error) {
      console.error("Docketwise API Error:", error);

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to fetch matters",
      });
    }
  });

// Get Matter by ID
export const getMatterById = authorized
  .route({
    method: "GET",
    path: "/matters/{id}",
    summary: "Get a single matter by ID",
    tags: ["Matters"],
  })
  .input(z.object({ id: z.number() }))
  .output(matterSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    const response = await fetch(`${DOCKETWISE_API_URL}/matters/${input.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }

    return response.json();
  });

// Create Matter
export const createMatter = authorized
  .route({
    method: "POST",
    path: "/matters",
    summary: "Create a new matter",
    tags: ["Matters"],
  })
  .input(matterInputSchema)
  .output(matterSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    const response = await fetch(`${DOCKETWISE_API_URL}/matters`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ matter: input }),
    });

    if (!response.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create matter",
      });
    }

    return response.json();
  });

// Update Matter
export const updateMatter = authorized
  .route({
    method: "PUT",
    path: "/matters/{id}",
    summary: "Update a matter",
    tags: ["Matters"],
  })
  .input(
    matterInputSchema
      .extend({
        id: z.number(),
      })
      .partial()
      .required({ id: true }),
  )
  .output(matterSchema)
  .handler(async ({ input }) => {
    const { id, ...data } = input;
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    const response = await fetch(`${DOCKETWISE_API_URL}/matters/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ matter: data }),
    });

    if (!response.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to update matter",
      });
    }

    return response.json();
  });

// Delete Matter
export const deleteMatter = authorized
  .route({
    method: "DELETE",
    path: "/matters/{id}",
    summary: "Delete a matter",
    tags: ["Matters"],
  })
  .input(z.object({ id: z.number() }))
  .output(z.object({ success: z.boolean(), message: z.string() }))
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    const response = await fetch(`${DOCKETWISE_API_URL}/matters/${input.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to delete matter",
      });
    }

    return {
      success: true,
      message: "Matter deleted successfully",
    };
  });

// Get Matter Receipts
export const getMatterReceipts = authorized
  .route({
    method: "GET",
    path: "/matters/{id}/receipts",
    summary: "Get receipts for a matter",
    tags: ["Matters"],
  })
  .input(z.object({ id: z.number() }))
  .output(z.array(receiptSchema))
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    const response = await fetch(
      `${DOCKETWISE_API_URL}/matters/${input.id}/receipts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to fetch matter receipts",
      });
    }

    return response.json();
  });
