import { docketwiseRequest } from "@/lib/docketwise";
import { os } from "@/lib/orpc";
import {
  matterFilterSchema,
  matterInputSchema,
  matterSchema,
  paginatedMattersSchema,
  paginationMetaSchema,
  receiptSchema,
  type MatterFilterSchemaType,
  type MatterSchemaType,
} from "@/schema/matterSchema";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

export type { MatterFilterSchemaType, MatterSchemaType };

// Get Matters from Docketwise API
export const getMatters = os
  .route({
    method: "GET",
    path: "/matters",
    summary: "Get all matters from Docketwise",
    tags: ["Matters"],
  })
  .input(matterFilterSchema)
  .output(paginatedMattersSchema)
  .handler(async ({ input }) => {
    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (input.page) {
        params.append("page", input.page.toString());
      }

      if (input.archived !== undefined) {
        params.append("archived", input.archived.toString());
      }

      if (input.client_id) {
        params.append("client_id", input.client_id.toString());
      }

      const queryString = params.toString();
      const endpoint = `/matters${queryString ? `?${queryString}` : ""}`;

      // Make request to Docketwise API
      const response = await docketwiseRequest<
        | z.infer<typeof matterSchema>[]
        | {
            data: z.infer<typeof matterSchema>[];
            pagination?: z.infer<typeof paginationMetaSchema>;
          }
      >(endpoint);

      // Transform response to match our schema
      if (Array.isArray(response)) {
        return {
          data: response,
          pagination: undefined,
        };
      }

      return {
        data: response.data,
        pagination: response.pagination,
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch matters from Docketwise",
      });
    }
  });

// Get single matter by ID
export const getMatterById = os
  .route({
    method: "GET",
    path: "/matters/{id}",
    summary: "Get a single matter by ID",
    tags: ["Matters"],
  })
  .input(z.object({ id: z.number() }))
  .output(matterSchema)
  .handler(async ({ input }) => {
    try {
      const matter = await docketwiseRequest<z.infer<typeof matterSchema>>(
        `/matters/${input.id}`,
      );
      return matter;
    } catch {
      throw new ORPCError("NOT_FOUND", {
        message: "Matter not found",
      });
    }
  });

// Create Matter
export const createMatter = os
  .route({
    method: "POST",
    path: "/matters",
    summary: "Create a new matter",
    tags: ["Matters"],
  })
  .input(matterInputSchema)
  .output(matterSchema)
  .handler(async ({ input }) => {
    try {
      const matter = await docketwiseRequest<z.infer<typeof matterSchema>>(
        "/matters",
        {
          method: "POST",
          body: JSON.stringify({ matter: input }),
        },
      );
      return matter;
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to create matter",
      });
    }
  });

// Update Matter
export const updateMatter = os
  .route({
    method: "PUT",
    path: "/matters/{id}",
    summary: "Update a matter",
    tags: ["Matters"],
  })
  .input(
    matterInputSchema.extend({
      id: z.number(),
    }).partial().required({ id: true }),
  )
  .output(matterSchema)
  .handler(async ({ input }) => {
    const { id, ...data } = input;

    try {
      const matter = await docketwiseRequest<z.infer<typeof matterSchema>>(
        `/matters/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ matter: data }),
        },
      );
      return matter;
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to update matter",
      });
    }
  });

// Delete Matter
export const deleteMatter = os
  .route({
    method: "DELETE",
    path: "/matters/{id}",
    summary: "Delete a matter",
    tags: ["Matters"],
  })
  .input(z.object({ id: z.number() }))
  .output(z.object({ success: z.boolean(), message: z.string() }))
  .handler(async ({ input }) => {
    try {
      await docketwiseRequest<void>(`/matters/${input.id}`, {
        method: "DELETE",
      });

      return {
        success: true,
        message: "Matter deleted successfully",
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Failed to delete matter",
      });
    }
  });

// Get matter receipts
export const getMatterReceipts = os
  .route({
    method: "GET",
    path: "/matters/{id}/receipts",
    summary: "Get receipts for a matter",
    tags: ["Matters"],
  })
  .input(z.object({ id: z.number() }))
  .output(z.array(receiptSchema))
  .handler(async ({ input }) => {
    try {
      const receipts = await docketwiseRequest<z.infer<typeof receiptSchema>[]>(
        `/matters/${input.id}/receipts`,
      );
      return receipts;
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch matter receipts",
      });
    }
  });
