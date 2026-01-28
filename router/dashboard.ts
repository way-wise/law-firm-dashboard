import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { fetchMattersRealtime } from "@/lib/services/docketwise-matters";
import * as z from "zod";

// Enhanced dashboard stats schema - comprehensive KPIs
const dashboardStatsSchema = z.object({
  // Basic counts
  totalContacts: z.number(),
  totalMatters: z.number(),
  totalMatterTypes: z.number(),
  teamMembers: z.number(),
  categories: z.number(),
  activeTeamMembers: z.number(),
  matterTypesWithWorkflow: z.number(),
  editedMatters: z.number(),

  // Matter performance metrics
  activeMatters: z.number(),
  completedMatters: z.number(),
  overdueMatters: z.number(),
  atRiskMatters: z.number(), // Due within 7 days
  unassignedMatters: z.number(),

  // Financial metrics
  totalRevenue: z.number(),
  pendingRevenue: z.number(),
  collectedRevenue: z.number(),
  averageMatterValue: z.number(),

  // Performance metrics
  matterVelocity: z.number(), // Average days to completion
  onTimeRate: z.number(), // Percentage completed on time
  teamUtilization: z.number(), // Active capacity percentage

  // Trend data (month over month)
  mattersTrend: z.number().optional(), // Percentage change
  revenueTrend: z.number().optional(), // Percentage change
});

// Assignee stats schema
const assigneeStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  matterCount: z.number(),
  completedCount: z.number(),
  overdueCount: z.number(),
  onTimeRate: z.number(),
  avgDaysOpen: z.number(),
});

// Recent matters schema for dashboard
const recentMatterSchema = z.object({
  id: z.string(),
  docketwiseId: z.number(),
  title: z.string(),
  clientName: z.string().nullable(),
  matterType: z.string().nullable(),
  matterTypeId: z.number().nullable(),
  status: z.string().nullable(),
  statusForFiling: z.string().nullable(),
  assignees: z.string().nullable(),
  billingStatus: z
    .enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"])
    .nullable(),
  estimatedDeadline: z.date().nullable(),
  calculatedDeadline: z.date().nullable().optional(),
  isPastEstimatedDeadline: z.boolean().optional(),
  docketwiseCreatedAt: z.date().nullable(),
  updatedAt: z.date(),
});

// Matter status distribution schema
const statusDistributionSchema = z.object({
  status: z.string(),
  count: z.number(),
});

// Matter type distribution schema
const typeDistributionSchema = z.object({
  type: z.string(),
  count: z.number(),
});

// Get Dashboard Stats
export const getDashboardStats = authorized
  .route({
    method: "GET",
    path: "/dashboard/stats",
    summary: "Get dashboard statistics",
    tags: ["Dashboard"],
  })
  .output(dashboardStatsSchema)
  .handler(async ({ context }) => {
    // Basic counts
    const totalContacts = await prisma.contacts.count();
    const totalMatters = await prisma.matters.count({
      where: { 
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
    });
    const categories = await prisma.categories.count();
    const totalMatterTypes = await prisma.matterTypes.count();
    const matterTypesWithWorkflow = await prisma.matterTypes.count({
      where: {
        matterStatuses: {
          some: {},
        },
      },
    });
    const teamMembers = await prisma.teams.count();
    const activeTeamMembers = await prisma.teams.count({
      where: { isActive: true },
    });
    const editedMatters = await prisma.matters.count({
      where: {
        userId: context.user.id,
        isEdited: true,
        archived: false,
        discardedAt: null,
      },
    });

    // Get all matters for performance calculations
    const allMatters = await prisma.matters.findMany({
      where: { 
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      select: {
        status: true,
        closedAt: true,
        estimatedDeadline: true,
        actualDeadline: true,
        docketwiseCreatedAt: true,
        createdAt: true,
        billingStatus: true,
        totalHours: true,
        assignees: true,
        archived: true,
        discardedAt: true,
      },
    });

    // Calculate matter performance metrics
    const now = new Date();
    const activeMatters = allMatters.filter(
      (m) =>
        !m.archived &&
        !m.discardedAt &&
        !m.closedAt &&
        !(m.status || "").toLowerCase().includes("closed"),
    ).length;

    const completedMatters = allMatters.filter(
      (m) =>
        !m.archived &&
        !m.discardedAt &&
        (m.closedAt || (m.status || "").toLowerCase().includes("closed")),
    ).length;

    // Calculate overdue and at-risk matters
    let overdueMatters = 0;
    let atRiskMatters = 0;
    let totalDaysOpen = 0;
    let onTimeCount = 0;

    // Get matter types for deadline calculations
    const matterTypes = await prisma.matterTypes.findMany({
      select: { docketwiseId: true, estimatedDays: true },
    });
    const matterTypeEstDaysMap = new Map<number, number>();
    for (const mt of matterTypes) {
      if (mt.estimatedDays) {
        matterTypeEstDaysMap.set(mt.docketwiseId, mt.estimatedDays);
      }
    }

    for (const matter of allMatters) {
      // Determine deadline
      const deadline = matter.estimatedDeadline;
      if (!deadline && matter.docketwiseCreatedAt) {
        // This would need matterTypeId from the matter record
        // For now, skip calculated deadlines
      }

      const isClosed =
        !!matter.closedAt ||
        (matter.status || "").toLowerCase().includes("closed");

      if (!isClosed && deadline) {
        if (now > deadline) {
          overdueMatters++;
        } else if (
          deadline.getTime() - now.getTime() <=
          7 * 24 * 60 * 60 * 1000
        ) {
          atRiskMatters++;
        }
      }

      // Calculate days open for velocity
      const created = matter.docketwiseCreatedAt
        ? new Date(matter.docketwiseCreatedAt)
        : matter.createdAt;
      if (created && !isNaN(created.getTime())) {
        const ageDays = Math.max(
          0,
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (!isClosed) {
          totalDaysOpen += ageDays;
        }
      }

      // Calculate on-time completion
      if (isClosed && deadline) {
        const completionDate = matter.actualDeadline || matter.closedAt || now;
        if (completionDate <= deadline) {
          onTimeCount++;
        }
      }
    }

    const unassignedMatters = allMatters.filter((m) => !m.assignees).length;
    const matterVelocity =
      activeMatters > 0 ? Math.round(totalDaysOpen / activeMatters) : 0;
    const onTimeRate =
      completedMatters > 0
        ? Math.round((onTimeCount / completedMatters) * 100)
        : 100;
    const teamUtilization =
      activeTeamMembers > 0
        ? Math.round((activeMatters / (activeTeamMembers * 20)) * 100)
        : 0; // Assuming 20 matters per team member

    // Calculate financial metrics (assuming hourly rate of $200)
    const hourlyRate = 200;
    const totalRevenue = allMatters.reduce(
      (sum, m) => sum + (m.totalHours || 0) * hourlyRate,
      0,
    );
    const pendingRevenue = allMatters
      .filter((m) => m.billingStatus !== "PAID")
      .reduce((sum, m) => sum + (m.totalHours || 0) * hourlyRate, 0);
    const collectedRevenue = totalRevenue - pendingRevenue;
    const averageMatterValue =
      totalMatters > 0 ? totalRevenue / totalMatters : 0;

    // Calculate trend data (compare with previous period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousMatters = await prisma.matters.count({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    const previousRevenue = await prisma.matters.aggregate({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
      _sum: {
        totalHours: true,
      },
    });

    const previousRevenueAmount = (previousRevenue._sum.totalHours || 0) * 200; // Same hourly rate

    // Calculate trends (handle edge cases)
    const mattersTrend =
      previousMatters > 0
        ? ((totalMatters - previousMatters) / previousMatters) * 100
        : 0;

    const revenueTrend =
      previousRevenueAmount > 0
        ? ((totalRevenue - previousRevenueAmount) / previousRevenueAmount) * 100
        : 0;

    return {
      // Basic counts
      totalContacts,
      totalMatters,
      totalMatterTypes,
      teamMembers,
      categories,
      activeTeamMembers,
      matterTypesWithWorkflow,
      editedMatters,

      // Matter performance metrics
      activeMatters,
      completedMatters,
      overdueMatters,
      atRiskMatters,
      unassignedMatters,

      // Financial metrics
      totalRevenue,
      pendingRevenue,
      collectedRevenue,
      averageMatterValue,

      // Performance metrics
      matterVelocity,
      onTimeRate,
      teamUtilization,

      // Trend data
      mattersTrend: mattersTrend || 0,
      revenueTrend: revenueTrend || 0,
    };
  });

// Get Assignee Stats (matters per assignee)
export const getAssigneeStats = authorized
  .route({
    method: "GET",
    path: "/dashboard/assignee-stats",
    summary: "Get matter counts and KPIs per assignee",
    tags: ["Dashboard"],
  })
  .output(z.array(assigneeStatsSchema))
  .handler(async ({ context }) => {
    // Get all active team members
    const teamMembers = await prisma.teams.findMany({
      where: {
        isActive: true,
      },
      select: {
        docketwiseId: true,
        fullName: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Get matter types for estimated days
    const matterTypes = await prisma.matterTypes.findMany({
      select: {
        docketwiseId: true,
        estimatedDays: true,
      },
    });
    const matterTypeEstDaysMap = new Map<number, number>();
    for (const mt of matterTypes) {
      if (mt.estimatedDays) {
        matterTypeEstDaysMap.set(mt.docketwiseId, mt.estimatedDays);
      }
    }

    // Get all matters with assignees for this user
    const matters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        docketwiseUserIds: { not: null },
        archived: false,
        discardedAt: null,
      },
      select: {
        docketwiseUserIds: true,
        status: true,
        closedAt: true,
        createdAt: true,
        docketwiseCreatedAt: true,
        estimatedDeadline: true,
        actualDeadline: true,
        matterTypeId: true,
      },
    });

    // Initialize stats per assignee
    const assigneeStats = new Map<
      number,
      {
        total: number;
        completed: number;
        overdue: number;
        onTime: number;
        totalDaysOpen: number;
        openCount: number;
      }
    >();

    // Initialize all team members with 0 stats
    for (const member of teamMembers) {
      assigneeStats.set(member.docketwiseId, {
        total: 0,
        completed: 0,
        overdue: 0,
        onTime: 0,
        totalDaysOpen: 0,
        openCount: 0,
      });
    }

    const now = new Date();

    for (const matter of matters) {
      if (matter.docketwiseUserIds) {
        let userIds: number[] = [];
        try {
          const rawIds = JSON.parse(matter.docketwiseUserIds);
          userIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
            .map((id: unknown) => Number(id))
            .filter((id: number) => !isNaN(id));
        } catch {
          continue;
        }

        // Determine matter status
        const isClosed =
          !!matter.closedAt ||
          (matter.status || "").toLowerCase().includes("closed") ||
          (matter.status || "").toLowerCase().includes("approved");

        // Determine deadline
        let deadline = matter.estimatedDeadline;

        // Sanitize deadline from DB - if it's 1970, treat as null
        if (deadline) {
          const date = new Date(deadline);
          if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
            deadline = null;
          }
        }

        // If no custom deadline, try calculated
        if (!deadline && matter.docketwiseCreatedAt && matter.matterTypeId) {
          const createdAt = new Date(matter.docketwiseCreatedAt);
          if (!isNaN(createdAt.getTime()) && createdAt.getFullYear() > 1970) {
            const estDays = matterTypeEstDaysMap.get(matter.matterTypeId);
            if (estDays && estDays > 0) {
              const calculated = new Date(createdAt);
              calculated.setDate(calculated.getDate() + estDays);
              // Ensure calculated date is valid
              if (calculated.getFullYear() > 1970) {
                deadline = calculated;
              }
            }
          }
        }

        const isOverdue = !isClosed && deadline && now > deadline;

        // Determine on-time (only for completed matters)
        // If completed and (actualDeadline <= estimated OR closedAt <= estimated)
        let isOnTime = false;
        if (isClosed && deadline) {
          const completionDate =
            matter.actualDeadline || matter.closedAt || now;
          isOnTime = completionDate <= deadline;
        } else if (isClosed && !deadline) {
          isOnTime = true; // Assume on time if no deadline
        }

        // Calculate age
        const created = matter.docketwiseCreatedAt
          ? new Date(matter.docketwiseCreatedAt)
          : matter.createdAt;
        const ageDays = Math.max(
          0,
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (const userId of userIds) {
          const stats = assigneeStats.get(userId);
          if (stats) {
            stats.total++;
            if (isClosed) {
              stats.completed++;
              if (isOnTime) stats.onTime++;
            } else {
              if (isOverdue) stats.overdue++;
              stats.totalDaysOpen += ageDays;
              stats.openCount++;
            }
          }
        }
      }
    }

    // Map team members with their detailed stats
    return teamMembers
      .map((member) => {
        const stats = assigneeStats.get(member.docketwiseId) || {
          total: 0,
          completed: 0,
          overdue: 0,
          onTime: 0,
          totalDaysOpen: 0,
          openCount: 0,
        };

        const onTimeRate =
          stats.completed > 0
            ? Math.round((stats.onTime / stats.completed) * 100)
            : 100; // Default to 100% if no completed cases

        const avgDaysOpen =
          stats.openCount > 0
            ? Math.round(stats.totalDaysOpen / stats.openCount)
            : 0;

        return {
          id: member.docketwiseId,
          name:
            member.fullName ||
            `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
            member.email,
          email: member.email,
          matterCount: stats.total,
          completedCount: stats.completed,
          overdueCount: stats.overdue,
          onTimeRate,
          avgDaysOpen,
        };
      })
      .sort((a, b) => b.matterCount - a.matterCount); // Sort by workload
  });

// Get Recent Matters for Dashboard
export const getRecentMatters = authorized
  .route({
    method: "GET",
    path: "/dashboard/recent-matters",
    summary: "Get recent matters for dashboard",
    tags: ["Dashboard"],
  })
  .input(
    z.object({
      limit: z.number().optional().default(10),
    }),
  )
  .output(z.array(recentMatterSchema))
  .handler(async ({ input, context }) => {
    // Fetch matters directly from Docketwise API with real-time data (first page only for dashboard)
    const result = await fetchMattersRealtime({
      page: 1,
      perPage: input.limit,
      userId: context.user.id,
    });

    // Load matter types for deadline calculation
    const matterTypes = await prisma.matterTypes.findMany({
      select: {
        docketwiseId: true,
        estimatedDays: true,
      },
    });

    const matterTypeEstDaysMap = new Map<number, number>();
    for (const mt of matterTypes) {
      if (mt.estimatedDays) {
        matterTypeEstDaysMap.set(mt.docketwiseId, mt.estimatedDays);
      }
    }

    // Calculate deadlines for dashboard matters
    const mattersWithDeadlines = result.data.map((matter) => {
      let calculatedDeadline: Date | null = null;
      let isPastEstimatedDeadline = false;

      if (matter.docketwiseCreatedAt && matter.matterTypeId) {
        const createdAt = new Date(matter.docketwiseCreatedAt);
        if (!isNaN(createdAt.getTime()) && createdAt.getFullYear() > 1970) {
          const estDays = matterTypeEstDaysMap.get(matter.matterTypeId);
          if (estDays && estDays > 0) {
            const targetDate = new Date(createdAt);
            targetDate.setDate(targetDate.getDate() + estDays);

            if (targetDate.getFullYear() > 1970) {
              calculatedDeadline = targetDate;
              isPastEstimatedDeadline = new Date() > calculatedDeadline;
            }
          }
        }
      }

      // Sanitize estimatedDeadline - if it's 1970, treat as null
      let estimatedDeadline = matter.estimatedDeadline;
      if (estimatedDeadline) {
        const date = new Date(estimatedDeadline);
        if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
          estimatedDeadline = null;
        }
      }

      return {
        id: matter.id as string,
        docketwiseId: matter.docketwiseId,
        title: matter.title,
        clientName: matter.clientName,
        matterType: matter.matterType,
        matterTypeId: matter.matterTypeId,
        status: matter.status,
        statusForFiling: matter.statusForFiling,
        assignees: matter.assignees,
        billingStatus: matter.billingStatus,
        estimatedDeadline,
        docketwiseCreatedAt: matter.docketwiseCreatedAt,
        updatedAt: matter.updatedAt,
        calculatedDeadline,
        isPastEstimatedDeadline,
      };
    });

    return mattersWithDeadlines;
  });

// Get Matter Status Distribution
export const getMatterStatusDistribution = authorized
  .route({
    method: "GET",
    path: "/dashboard/status-distribution",
    summary: "Get matter status distribution for charts",
    tags: ["Dashboard"],
  })
  .output(z.array(statusDistributionSchema))
  .handler(async ({ context }) => {
    // Group matters by status
    const statusGroups = await prisma.matters.groupBy({
      by: ["status"],
      where: {
        userId: context.user.id,
        status: { not: null },
        archived: false,
        discardedAt: null,
      },
      _count: true,
    });

    return statusGroups.map((group) => ({
      status: group.status || "Unknown",
      count: group._count,
    }));
  });

// Get Matter Type Distribution
export const getMatterTypeDistribution = authorized
  .route({
    method: "GET",
    path: "/dashboard/type-distribution",
    summary: "Get matter type distribution for charts",
    tags: ["Dashboard"],
  })
  .output(z.array(typeDistributionSchema))
  .handler(async ({ context }) => {
    // Group matters by type
    const typeGroups = await prisma.matters.groupBy({
      by: ["matterType"],
      where: {
        userId: context.user.id,
        matterType: { not: null },
      },
      _count: true,
    });

    return typeGroups.map((group) => ({
      type: group.matterType || "Unknown",
      count: group._count,
    }));
  });
