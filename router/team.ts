import { getDocketwiseToken } from "@/lib/docketwise";
import { authorized } from "@/lib/orpc";
import {
  paginatedTeamSchema,
  teamFilterSchema,
  teamMemberInputSchema,
  teamMemberSchema,
  type TeamFilterSchemaType,
  type TeamMemberSchemaType,
} from "@/schema/teamSchema";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

export type { TeamFilterSchemaType, TeamMemberSchemaType };

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Get Team Members (Docketwise users endpoint)
export const getTeamMembers = authorized
  .route({
    method: "GET",
    path: "/team",
    summary: "Get all team members from Docketwise",
    tags: ["Team"],
  })
  .input(teamFilterSchema)
  .output(paginatedTeamSchema)
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
      if (input.active !== undefined)
        params.append("active", input.active.toString());

      const queryString = params.toString();
      const endpoint = `/users${queryString ? `?${queryString}` : ""}`;

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
          error instanceof Error
            ? error.message
            : "Failed to fetch team members",
      });
    }
  });

// Get Team Member by ID
export const getTeamMemberById = authorized
  .route({
    method: "GET",
    path: "/team/:id",
    summary: "Get a single team member by ID",
    tags: ["Team"],
  })
  .input(z.object({ id: z.number() }))
  .output(teamMemberSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const response = await fetch(`${DOCKETWISE_API_URL}/users/${input.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new ORPCError("NOT_FOUND", {
          message: `Team member not found: ${response.status}`,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch team member",
      });
    }
  });

// Create Team Member
export const createTeamMember = authorized
  .route({
    method: "POST",
    path: "/team",
    summary: "Create a new team member",
    tags: ["Team"],
  })
  .input(teamMemberInputSchema)
  .output(teamMemberSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const response = await fetch(`${DOCKETWISE_API_URL}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: input }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Docketwise API Error:", response.status, errorText);
        throw new ORPCError("BAD_REQUEST", {
          message: `Failed to create team member: ${response.statusText}`,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create team member",
      });
    }
  });

// Update Team Member
export const updateTeamMember = authorized
  .route({
    method: "PATCH",
    path: "/team/:id",
    summary: "Update a team member",
    tags: ["Team"],
  })
  .input(
    z.object({
      id: z.number(),
      user: teamMemberInputSchema,
    }),
  )
  .output(teamMemberSchema)
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Docketwise not connected",
      });
    }

    try {
      const response = await fetch(`${DOCKETWISE_API_URL}/users/${input.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: input.user }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Docketwise API Error:", response.status, errorText);
        throw new ORPCError("BAD_REQUEST", {
          message: `Failed to update team member: ${response.statusText}`,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to update team member",
      });
    }
  });

// Delete Team Member
export const deleteTeamMember = authorized
  .route({
    method: "DELETE",
    path: "/team/:id",
    summary: "Delete a team member",
    tags: ["Team"],
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
      const response = await fetch(`${DOCKETWISE_API_URL}/users/${input.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Docketwise API Error:", response.status, errorText);
        throw new ORPCError("BAD_REQUEST", {
          message: `Failed to delete team member: ${response.statusText}`,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Docketwise API Error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete team member",
      });
    }
  });
