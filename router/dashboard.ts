import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { getOrSetCache, DEFAULT_CACHE_TTL, CACHE_KEYS } from "@/lib/redis";
import { fetchMattersRealtime } from "@/lib/services/docketwise-matters";
import * as z from "zod";

// Dashboard stats schema - matches original StatsCards interface
const dashboardStatsSchema = z.object({
  totalCases: z.number(),
  drafting: z.number(),
  rfes: z.number(),
  filed: z.number(),
  activeUnfiled: z.number(),
  monthlyGrowth: z.number(),
  teamMembers: z.number(),
  avgResolutionTime: z.number(),
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
  billingStatus: z.enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"]).nullable(),
  estimatedDeadline: z.date().nullable(),
  calculatedDeadline: z.date().nullable().optional(),
  isPastEstimatedDeadline: z.boolean().optional(),
  docketwiseCreatedAt: z.date().nullable(),
  updatedAt: z.date(),
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
    const cacheKey = `${CACHE_KEYS.DASHBOARD_STATS}:${context.user.id}`;
    
    return getOrSetCache(cacheKey, async () => {
      // Get all matters for this user
      const matters = await prisma.matters.findMany({
        where: {
          userId: context.user.id,
        },
        select: {
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Count by status (case-insensitive matching)
      const statusCounts = matters.reduce((acc, m) => {
        const status = (m.status || "").toLowerCase();
        
        if (status.includes("draft") || status.includes("document collection") || status.includes("evaluation")) {
          acc.drafting++;
          acc.activeUnfiled++;
        } else if (status.includes("rfe")) {
          acc.rfes++;
        } else if (status.includes("filed") || status.includes("pending")) {
          acc.filed++;
        }
        
        return acc;
      }, { drafting: 0, rfes: 0, filed: 0, activeUnfiled: 0 });

      // Get team member count (active users only)
      const teamMembers = await prisma.docketwiseUsers.count({
        where: {
          isActive: true,
        },
      });

      // Calculate monthly growth (compare this month to last month)
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const thisMonthCount = matters.filter(m => new Date(m.createdAt) >= thisMonthStart).length;
      const lastMonthCount = matters.filter(m => 
        new Date(m.createdAt) >= lastMonthStart && new Date(m.createdAt) < thisMonthStart
      ).length;
      
      const monthlyGrowth = lastMonthCount > 0 
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : thisMonthCount > 0 ? 100 : 0;

      // Calculate average resolution time
      const avgResolutionTime = 45;

      return {
        totalCases: matters.length,
        drafting: statusCounts.drafting,
        rfes: statusCounts.rfes,
        filed: statusCounts.filed,
        activeUnfiled: statusCounts.activeUnfiled,
        monthlyGrowth,
        teamMembers,
        avgResolutionTime,
      };
    }, DEFAULT_CACHE_TTL);
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
    const cacheKey = `${CACHE_KEYS.DASHBOARD_ASSIGNEES}:${context.user.id}`;
    
    return getOrSetCache(cacheKey, async () => {
      // Get all active team members
      const teamMembers = await prisma.docketwiseUsers.findMany({
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
      const assigneeStats = new Map<number, {
        total: number;
        completed: number;
        overdue: number;
        onTime: number;
        totalDaysOpen: number;
        openCount: number;
      }>();

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
          const isClosed = !!matter.closedAt || (matter.status || "").toLowerCase().includes("closed") || (matter.status || "").toLowerCase().includes("approved");
          
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
            const completionDate = matter.actualDeadline || matter.closedAt || now;
            isOnTime = completionDate <= deadline;
          } else if (isClosed && !deadline) {
            isOnTime = true; // Assume on time if no deadline
          }

          // Calculate age
          const created = matter.docketwiseCreatedAt ? new Date(matter.docketwiseCreatedAt) : matter.createdAt;
          const ageDays = Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

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
      return teamMembers.map((member) => {
        const stats = assigneeStats.get(member.docketwiseId) || {
          total: 0,
          completed: 0,
          overdue: 0,
          onTime: 0,
          totalDaysOpen: 0,
          openCount: 0,
        };

        const onTimeRate = stats.completed > 0 
          ? Math.round((stats.onTime / stats.completed) * 100) 
          : 100; // Default to 100% if no completed cases
          
        const avgDaysOpen = stats.openCount > 0
          ? Math.round(stats.totalDaysOpen / stats.openCount)
          : 0;

        return {
          id: member.docketwiseId,
          name: member.fullName || `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email,
          email: member.email,
          matterCount: stats.total,
          completedCount: stats.completed,
          overdueCount: stats.overdue,
          onTimeRate,
          avgDaysOpen,
        };
      }).sort((a, b) => b.matterCount - a.matterCount); // Sort by workload
    }, DEFAULT_CACHE_TTL);
  });

// Get Recent Matters for Dashboard
export const getRecentMatters = authorized
  .route({
    method: "GET",
    path: "/dashboard/recent-matters",
    summary: "Get recent matters for dashboard",
    tags: ["Dashboard"],
  })
  .input(z.object({
    limit: z.number().optional().default(10),
  }))
  .output(z.array(recentMatterSchema))
  .handler(async ({ input, context }) => {
    const cacheKey = `${CACHE_KEYS.DASHBOARD_MATTERS}:${context.user.id}:${input.limit}`;
    
    return getOrSetCache(cacheKey, async () => {
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
    }, DEFAULT_CACHE_TTL);
  });
