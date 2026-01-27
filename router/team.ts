import { authorized } from "@/lib/orpc";
import prisma, { Prisma } from "@/lib/prisma";
import {
  paginatedTeamSchema,
  teamFilterSchema,
  teamMemberSchema,
  type TeamFilterSchemaType,
  type TeamMemberSchemaType,
} from "@/schema/teamSchema";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

export type { TeamFilterSchemaType, TeamMemberSchemaType };

// Get Team Members from synced teams table (NOT direct API)
export const getTeamMembers = authorized
  .route({
    method: "GET",
    path: "/team",
    summary: "Get all team members from synced database",
    tags: ["Team"],
  })
  .input(teamFilterSchema)
  .output(paginatedTeamSchema)
  .handler(async ({ input }) => {
    const page = input.page || 1;
    const perPage = 50;


    // Temporarily bypass cache to get fresh data
    // return getOrSetCache(cacheKey, async () => {
      const where: Prisma.teamsWhereInput = {};
      
      if (input.active !== undefined) {
        where.isActive = input.active;
      }

      const [users, total] = await Promise.all([
        prisma.teams.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: { fullName: 'asc' },
        }),
        prisma.teams.count({ where }),
      ]);

      // Transform to match expected schema
      const data = users.map(user => ({
        id: user.docketwiseId,
        email: user.email,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.title,
        active: user.isActive,
        phone: null, // Teams table doesn't have phone field
        attorney_profile: user.firstName || user.lastName ? {
          id: user.docketwiseId,
          first_name: user.firstName,
          last_name: user.lastName,
        } : null,
      }));


      const result = {
        data,
        pagination: total > perPage ? {
          total,
          next_page: page * perPage < total ? page + 1 : null,
          previous_page: page > 1 ? page - 1 : null,
          total_pages: Math.ceil(total / perPage),
        } : undefined,
      };

      return result;
    // }, DEFAULT_CACHE_TTL);
  });

// Get Team Members List (simple list for assignee filter)
export const getTeamMembersList = authorized
  .route({
    method: "GET",
    path: "/team/list",
    summary: "Get simple list of team members for assignee filter",
    tags: ["Team"],
  })
  .output(z.array(z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  })))
  .handler(async () => {
    const teamMembers = await prisma.teams.findMany({
      where: { isActive: true },
      select: {
        docketwiseId: true,
        fullName: true,
        email: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return teamMembers.map(member => ({
      id: member.docketwiseId,
      name: member.fullName || member.email,
      email: member.email,
    }));
  });

// Get Team Member by ID from database
export const getTeamMemberById = authorized
  .route({
    method: "GET",
    path: "/team/:id",
    summary: "Get a single team member by ID from synced database",
    tags: ["Team"],
  })
  .input(z.object({ id: z.number() }))
  .output(teamMemberSchema)
  .handler(async ({ input }) => {
    const user = await prisma.teams.findUnique({
      where: { docketwiseId: input.id },
    });

    if (!user) {
      throw new ORPCError("NOT_FOUND", {
        message: `Team member not found: ${input.id}`,
      });
    }

    return {
      id: user.docketwiseId,
      email: user.email,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.title,
      active: user.isActive,
      phone: null, // Teams table doesn't have phone field
      attorney_profile: user.firstName || user.lastName ? {
        id: user.docketwiseId,
        first_name: user.firstName,
        last_name: user.lastName,
      } : null,
    };
  });

