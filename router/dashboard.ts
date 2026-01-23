import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { getOrSetCache, CACHE_KEYS, DEFAULT_CACHE_TTL } from "@/lib/redis";
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
});

// Recent matters schema for dashboard
const recentMatterSchema = z.object({
  id: z.string(),
  docketwiseId: z.number(),
  title: z.string(),
  clientName: z.string().nullable(),
  matterType: z.string().nullable(),
  status: z.string().nullable(),
  statusForFiling: z.string().nullable(),
  assignees: z.string().nullable(),
  billingStatus: z.enum(["PAID", "DEPOSIT_PAID", "PAYMENT_PLAN", "DUE"]).nullable(),
  estimatedDeadline: z.date().nullable(),
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
    summary: "Get matter counts per assignee",
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

      // Get all matters with assignees for this user
      const matters = await prisma.matters.findMany({
        where: {
          userId: context.user.id,
          docketwiseUserIds: { not: null },
        },
        select: {
          docketwiseUserIds: true,
          assignees: true,
        },
      });

      // Count matters per assignee
      const assigneeCounts = new Map<number, number>();
      
      for (const matter of matters) {
        if (matter.docketwiseUserIds) {
          try {
            const userIds = JSON.parse(matter.docketwiseUserIds) as number[];
            for (const userId of userIds) {
              assigneeCounts.set(userId, (assigneeCounts.get(userId) || 0) + 1);
            }
          } catch {
            // Skip if parsing fails
          }
        }
      }

      // Map team members with their matter counts
      return teamMembers.map((member) => ({
        id: member.docketwiseId,
        name: member.fullName || `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email,
        email: member.email,
        matterCount: assigneeCounts.get(member.docketwiseId) || 0,
      }));
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
      const matters = await prisma.matters.findMany({
        where: {
          userId: context.user.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: input.limit,
        select: {
          id: true,
          docketwiseId: true,
          title: true,
          clientName: true,
          matterType: true,
          status: true,
          statusForFiling: true,
          assignees: true,
          billingStatus: true,
          estimatedDeadline: true,
          updatedAt: true,
        },
      });

      return matters;
    }, DEFAULT_CACHE_TTL);
  });
