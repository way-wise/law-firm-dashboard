import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Get all active Docketwise users for UI components
export const getActiveUsers = authorized
  .route({
    method: "GET",
    path: "/users/active",
    summary: "Get all active users",
    tags: ["Users"],
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
        isActive: z.boolean(),
      })
    )
  )
  .handler(async () => {
    const users = await prisma.docketwiseUsers.findMany({
      where: {
        isActive: true,
      },
      select: {
        docketwiseId: true,
        fullName: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return users.map(user => ({
      id: user.docketwiseId,
      name: user.fullName || user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || user.email,
      isActive: user.isActive,
    }));
  });

// Get user by ID
export const getUserById = authorized
  .route({
    method: "GET",
    path: "/users/{id}",
    summary: "Get user by ID",
    tags: ["Users"],
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
      isActive: z.boolean(),
    }).nullable()
  )
  .handler(async ({ input }) => {
    const user = await prisma.docketwiseUsers.findFirst({
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
        isActive: true,
      },
    });

    if (!user) return null;

    return {
      id: user.docketwiseId,
      name: user.fullName || user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || user.email,
      isActive: user.isActive,
    };
  });
