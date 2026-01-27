import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Get all active team members
export const getActiveTeams = authorized
  .route({
    method: "GET",
    path: "/teams/active",
    summary: "Get all active team members",
    tags: ["Teams"],
  })
  .input(z.object({}))
  .output(
    z.array(
      z.object({
        id: z.number(), // docketwiseId
        name: z.string(),
        email: z.string(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        fullName: z.string(),
        teamType: z.string(),
        title: z.string().nullable(),
        isActive: z.boolean(),
      })
    )
  )
  .handler(async () => {
    const teams = await prisma.teams.findMany({
      where: {
        isActive: true,
      },
      select: {
        docketwiseId: true,
        fullName: true,
        email: true,
        firstName: true,
        lastName: true,
        teamType: true,
        title: true,
        isActive: true,
      },
      orderBy: [
        { teamType: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return teams.map(team => ({
      id: team.docketwiseId,
      name: team.fullName || team.email,
      email: team.email,
      firstName: team.firstName,
      lastName: team.lastName,
      fullName: team.fullName || team.email,
      teamType: team.teamType,
      title: team.title,
      isActive: team.isActive,
    }));
  });

// Get team member by ID
export const getTeamMemberById = authorized
  .route({
    method: "GET",
    path: "/teams/{id}",
    summary: "Get team member by ID",
    tags: ["Teams"],
  })
  .input(z.object({ id: z.string() }))
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      fullName: z.string(),
      teamType: z.string(),
      title: z.string().nullable(),
      isActive: z.boolean(),
    }).nullable()
  )
  .handler(async ({ input }) => {
    const team = await prisma.teams.findFirst({
      where: {
        docketwiseId: parseInt(input.id),
        isActive: true,
      },
      select: {
        docketwiseId: true,
        fullName: true,
        email: true,
        firstName: true,
        lastName: true,
        teamType: true,
        title: true,
        isActive: true,
      },
    });

    if (!team) return null;

    return {
      id: team.docketwiseId,
      name: team.fullName || team.email,
      email: team.email,
      firstName: team.firstName,
      lastName: team.lastName,
      fullName: team.fullName || team.email,
      teamType: team.teamType,
      title: team.title,
      isActive: team.isActive,
    };
  });

// Get in-house team members only
export const getInHouseTeams = authorized
  .route({
    method: "GET",
    path: "/teams/in-house",
    summary: "Get in-house team members",
    tags: ["Teams"],
  })
  .input(z.object({}))
  .output(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        fullName: z.string(),
        teamType: z.string(),
        title: z.string().nullable(),
        isActive: z.boolean(),
      })
    )
  )
  .handler(async () => {
    const teams = await prisma.teams.findMany({
      where: {
        isActive: true,
        teamType: "inHouse",
      },
      select: {
        docketwiseId: true,
        fullName: true,
        email: true,
        firstName: true,
        lastName: true,
        teamType: true,
        title: true,
        isActive: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return teams.map(team => ({
      id: team.docketwiseId,
      name: team.fullName || team.email,
      email: team.email,
      firstName: team.firstName,
      lastName: team.lastName,
      fullName: team.fullName || team.email,
      teamType: team.teamType,
      title: team.title,
      isActive: team.isActive,
    }));
  });
