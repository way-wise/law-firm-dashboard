import { authorized } from "@/lib/orpc";
import { getPaginationQuery } from "@/lib/pagination";
import prisma, { Prisma } from "@/lib/prisma";
import { paginated } from "@/schema/paginationSchema";
import {
  todoFilterSchema,
  todoInputSchema,
  todoSchema,
} from "@/schema/todoSchema";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

// Get Todos
export const getTodos = authorized
  .route({
    method: "GET",
    path: "/todos",
    summary: "Get all todos",
    tags: ["Todos"],
  })
  .input(todoFilterSchema)
  .output(paginated(todoSchema))
  .handler(async ({ input, context }) => {
    const { skip, take, page, limit } = getPaginationQuery(input);

    // Build where clause
    const where: Prisma.todosWhereInput = {
      userId: context.user.id,
    };

    // Add search filter
    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    // Add status filter
    if (input.status) {
      where.status = input.status;
    }

    const [todos, total] = await prisma.$transaction([
      prisma.todos.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.todos.count({
        where,
      }),
    ]);

    return {
      data: todos,
      meta: {
        page,
        limit,
        total,
      },
    };
  });

// Create Todo
export const createTodo = authorized
  .route({
    method: "POST",
    path: "/todos",
    summary: "Create a new todo",
    tags: ["Todos"],
  })
  .input(todoInputSchema)
  .output(todoSchema)
  .handler(async ({ input, context }) => {
    const todo = await prisma.todos.create({
      data: {
        ...input,
        userId: context.user.id,
      },
    });

    return todo;
  });

// Update Todo
export const updateTodo = authorized
  .route({
    method: "PUT",
    path: "/todos/{id}",
    summary: "Update a todo",
    tags: ["Todos"],
  })
  .input(z.object({ id: z.string(), ...todoInputSchema.shape }))
  .output(todoSchema)
  .handler(async ({ input, context }) => {
    const user = context.user;
    const { id, ...data } = input;

    // Check if todo exists
    const todoExists = await prisma.todos.findUnique({
      where: {
        id,
      },
    });

    if (!todoExists) {
      throw new ORPCError("NOT_FOUND", {
        message: "Todo not found",
      });
    }

    // Check if authorized to update
    if (user.id !== todoExists.userId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Unauthorized to update this todo",
      });
    }

    const todo = await prisma.todos.update({
      where: {
        id,
      },
      data,
    });

    return todo;
  });

// Update status
export const updateTodoStatus = authorized
  .route({
    method: "PATCH",
    path: "/todos/{id}/status",
    summary: "Update a todo status",
    tags: ["Todos"],
  })
  .input(z.object({ id: z.string(), status: z.enum(["pending", "completed"]) }))
  .output(todoSchema)
  .handler(async ({ input, context }) => {
    const user = context.user;

    // Check if todo exists
    const todoExists = await prisma.todos.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!todoExists) {
      throw new ORPCError("NOT_FOUND", {
        message: "Todo not found",
      });
    }

    // Check if authorized to update status
    if (user.id !== todoExists.userId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Unauthorized to update this todo status",
      });
    }

    const todo = await prisma.todos.update({
      where: {
        id: input.id,
      },
      data: {
        status: input.status,
      },
    });

    return todo;
  });

// Delete Todo
export const deleteTodo = authorized
  .route({
    method: "DELETE",
    path: "/todos/{id}",
    summary: "Delete a todo",
    tags: ["Todos"],
  })
  .input(z.object({ id: z.string() }))
  .output(todoSchema)
  .handler(async ({ input, context }) => {
    const user = context.user;

    // Check if todo exists
    const todoExists = await prisma.todos.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!todoExists) {
      throw new ORPCError("NOT_FOUND", {
        message: "Todo not found",
      });
    }

    // Check if authorized to delete
    if (user.id !== todoExists.userId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Unauthorized to delete this todo",
      });
    }

    const todo = await prisma.todos.delete({
      where: {
        id: input.id,
      },
    });

    return todo;
  });
