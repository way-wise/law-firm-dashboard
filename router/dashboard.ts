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

  // Executive KPIs (Top Row)
  weightedActiveMatters: z.number(), // Active matters weighted by complexity
  revenueAtRisk: z.number(), // Revenue from matters due in next 14 days
  deadlineComplianceRate: z.number(), // Percentage of matters completed on time
  avgCycleTime: z.number(), // Average days from creation to completion
  paralegalUtilization: z.number(), // Average utilization across paralegals

  // Risk Command Center
  overdueMatters: z.number(),
  atRiskMatters: z.number(), // Due within 7 days
  unassignedMatters: z.number(),
  overloadedParalegals: z.number(), // Paralegals with >90% utilization

  // Financial metrics
  totalRevenue: z.number(),
  pendingRevenue: z.number(),
  collectedRevenue: z.number(),
  averageMatterValue: z.number(),

  // Performance metrics
  matterVelocity: z.number(), // Average days to completion
  onTimeRate: z.number(), // Percentage completed on time
  teamUtilization: z.number(), // Active capacity percentage

  // Quality metrics
  avgRfeRate: z.number(), // Average RFE rate per paralegal
  totalReworkCount: z.number(), // Total revisions across all matters
  qualityScore: z.number(), // Overall quality score (0-100)

  // Capacity analysis
  totalAvailableHours: z.number(), // Total available hours per month
  totalAssignedHours: z.number(), // Total estimated hours for assigned matters
  totalBillableHours: z.number(), // Total actual billable hours

  // Trend data (month over month)
  mattersTrend: z.number().optional(), // Percentage change
  revenueTrend: z.number().optional(), // Percentage change
  deadlineMissTrend: z.number().optional(), // Deadline miss trend last 30 days
});

// Get Dashboard Stats
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
  assignedDate: z.date().nullable().optional(),
  updatedAt: z.date(),
  totalHoursElapsed: z.number().optional(), // Hours since assignment
  daysUntilDeadline: z.number().optional(), // Days until calculated deadline
  estimatedDays: z.number().nullable().optional(),
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
    // === EXECUTIVE KPI CALCULATIONS ===
    
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

    // === COMPREHENSIVE DATA FETCH ===
    
    // Get comprehensive data for KPI calculations
    const [allMatters, matterTypesFull, paralegals] = await Promise.all([
      // All matters with full data
      prisma.matters.findMany({
        where: { 
          userId: context.user.id,
          archived: false,
          discardedAt: null,
        },
        select: {
          id: true,
          status: true,
          closedAt: true,
          estimatedDeadline: true,
          actualDeadline: true,
          docketwiseCreatedAt: true,
          createdAt: true,
          billingStatus: true,
          totalHours: true,
          assignees: true,
          teamId: true,
          matterTypeId: true,
          rfeCount: true,
          revisionCount: true,
          errorCount: true,
        },
      }),
      // Matter types with complexity and billing rates
      prisma.matterTypes.findMany({
        select: { 
          docketwiseId: true, 
          estimatedDays: true,
          complexityWeight: true,
          billingRate: true,
          name: true,
        },
      }),
      // Paralegals (active team members with capacity settings)
      prisma.teams.findMany({
        where: {
          isActive: true,
          availableHoursPerWeek: { not: null },
        },
        select: {
          docketwiseId: true,
          fullName: true,
          email: true,
          availableHoursPerWeek: true,
          utilizationTarget: true,
        },
      }),
    ]);

    // Create lookup maps
    const matterTypeMap = new Map(matterTypesFull.map(mt => [mt.docketwiseId, mt]));

    // Calculate basic matter metrics
    const now = new Date();

    // === EXECUTIVE KPI CALCULATIONS ===
    
    // 1. Weighted Active Matters
    const weightedActiveMatters = allMatters
      .filter(matter => !matter.closedAt && !(matter.status || "").toLowerCase().includes("closed"))
      .reduce((total, matter) => {
        const complexity = matterTypeMap.get(matter.matterTypeId || 0)?.complexityWeight || 1;
        return total + complexity;
      }, 0);

    // 2. Revenue at Risk (matters due in next 14 days)
    const next14Days = new Date();
    next14Days.setDate(next14Days.getDate() + 14);
    
    const revenueAtRisk = allMatters
      .filter(matter => {
        if (!matter.matterTypeId) return false;
        const deadline = matter.estimatedDeadline;
        if (!deadline) return false;
        const deadlineDate = new Date(deadline);
        return deadlineDate <= next14Days && deadlineDate >= now;
      })
      .reduce((total, matter) => {
        const matterType = matterTypeMap.get(matter.matterTypeId || 0);
        const rate = matterType?.billingRate;
        // Skip matters without billing rates for revenue calculations
        if (rate === null || rate === undefined) return total;
        return total + rate;
      }, 0);

    // 3. Deadline Compliance Rate
    const completedWithDeadlines = allMatters.filter(m => 
      m.closedAt && m.estimatedDeadline
    );
    const onTimeDeliveries = completedWithDeadlines.filter(m => 
      new Date(m.actualDeadline || m.closedAt!) <= new Date(m.estimatedDeadline!)
    ).length;
    const deadlineComplianceRate = completedWithDeadlines.length > 0 
      ? (onTimeDeliveries / completedWithDeadlines.length) * 100 
      : 0;

    // 4. Average Cycle Time
    const completedMatterData = allMatters.filter(matter => 
      matter.closedAt && matter.docketwiseCreatedAt
    );
    const avgCycleTime = completedMatterData.length > 0
      ? completedMatterData.reduce((total, matter) => {
          const days = (new Date(matter.closedAt!).getTime() - new Date(matter.docketwiseCreatedAt!).getTime()) / (1000 * 60 * 60 * 24);
          return total + days;
        }, 0) / completedMatterData.length
      : 0;

    // 5. Paralegal Utilization
    const paralegalUtilization = paralegals.length > 0
      ? paralegals.reduce((total, paralegal) => {
          const assignedMatters = allMatters.filter(m => m.teamId === paralegal.docketwiseId);
          const billableHours = assignedMatters.reduce((sum, m) => sum + (m.totalHours || 0), 0);
          const availableHours = (paralegal.availableHoursPerWeek || 0) * 4; // monthly
          const utilization = availableHours > 0 ? (billableHours / availableHours) * 100 : 0;
          return total + utilization;
        }, 0) / paralegals.length
      : 0;

    // Risk Command Center
    const overdueMatters = allMatters.filter(m => {
      if (!m.estimatedDeadline) return false;
      return new Date(m.estimatedDeadline) < now;
    }).length;

    const atRiskMatters = allMatters.filter(m => {
      if (!m.estimatedDeadline) return false;
      const daysUntil = Math.ceil((new Date(m.estimatedDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 7;
    }).length;

    const unassignedMatters = allMatters.filter(m => !m.teamId).length;

    const overloadedParalegals = paralegals.filter(paralegal => {
      const assignedMatters = allMatters.filter(m => m.teamId === paralegal.docketwiseId);
      const billableHours = assignedMatters.reduce((sum, m) => sum + (m.totalHours || 0), 0);
      const availableHours = (paralegal.availableHoursPerWeek || 0) * 4;
      const utilization = availableHours > 0 ? (billableHours / availableHours) * 100 : 0;
      return utilization > 90;
    }).length;

    // Financial metrics
    const totalRevenue = allMatters.reduce((sum, m) => {
      if (!m.matterTypeId) return sum;
      const matterType = matterTypeMap.get(m.matterTypeId || 0);
      const rate = matterType?.billingRate;
      // Skip matters without billing rates for revenue calculations
      if (rate === null || rate === undefined) return sum;
      return sum + ((m.totalHours || 0) * rate);
    }, 0);

    const pendingRevenue = allMatters
      .filter(m => m.billingStatus !== "PAID")
      .reduce((sum, m) => {
        if (!m.matterTypeId) return sum;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        const rate = matterType?.billingRate;
        // Skip matters without billing rates for revenue calculations
        if (rate === null || rate === undefined) return sum;
        return sum + ((m.totalHours || 0) * rate);
      }, 0);

    const collectedRevenue = allMatters
      .filter(m => m.billingStatus === "PAID")
      .reduce((sum, m) => {
        if (!m.matterTypeId) return sum;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        const rate = matterType?.billingRate;
        // Skip matters without billing rates for revenue calculations
        if (rate === null || rate === undefined) return sum;
        return sum + ((m.totalHours || 0) * rate);
      }, 0);

    // Quality metrics
    const avgRfeRate = paralegals.length > 0
      ? paralegals.reduce((total, paralegal) => {
          const assignedMatters = allMatters.filter(m => m.teamId === paralegal.docketwiseId);
          const rfeCount = assignedMatters.reduce((sum, m) => sum + (m.rfeCount || 0), 0);
          const rfeRate = assignedMatters.length > 0 ? (rfeCount / assignedMatters.length) * 100 : 0;
          return total + rfeRate;
        }, 0) / paralegals.length
      : 0;

    const totalReworkCount = allMatters.reduce((sum, m) => sum + (m.revisionCount || 0), 0);
    const qualityScore = Math.max(0, 100 - avgRfeRate - (totalReworkCount / Math.max(allMatters.length, 1)) * 10);

    // Capacity analysis
    const totalAvailableHours = paralegals.reduce((sum, p) => sum + ((p.availableHoursPerWeek || 0) * 4), 0);
    const totalBillableHours = allMatters.reduce((sum, m) => sum + (m.totalHours || 0), 0);
    
    // Estimate assigned hours (using matter type complexity)
    const totalAssignedHours = allMatters.reduce((sum, m) => {
      if (!m.matterTypeId) return sum;
      const matterType = matterTypeMap.get(m.matterTypeId || 0);
      const complexity = matterType?.complexityWeight || 1;
      const baseHours = matterType?.estimatedDays || 20; // Use estimated days or default
      return sum + (baseHours * complexity);
    }, 0);

    // Calculate trends (placeholder - should calculate from historical data)
    const mattersTrend = undefined; // TODO: Calculate from previous period
    const revenueTrend = undefined; // TODO: Calculate from previous period  
    const deadlineMissTrend = undefined; // TODO: Calculate from last 30 days

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

      // Executive KPIs (Top Row)
      weightedActiveMatters,
      revenueAtRisk,
      deadlineComplianceRate,
      avgCycleTime,
      paralegalUtilization,

      // Risk Command Center
      overdueMatters,
      atRiskMatters,
      unassignedMatters,
      overloadedParalegals,

      // Financial metrics
      totalRevenue,
      pendingRevenue,
      collectedRevenue,
      averageMatterValue: totalMatters > 0 ? totalRevenue / totalMatters : 0,

      // Performance metrics
      matterVelocity: avgCycleTime,
      onTimeRate: deadlineComplianceRate,
      teamUtilization: paralegalUtilization,

      // Quality metrics
      avgRfeRate,
      totalReworkCount,
      qualityScore,

      // Capacity analysis
      totalAvailableHours,
      totalAssignedHours,
      totalBillableHours,

      // Trend data
      mattersTrend,
      revenueTrend,
      deadlineMissTrend,
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
        assignees: true,
        docketwiseUserIds: true,
        status: true,
        statusForFiling: true,
        closedAt: true,
        docketwiseCreatedAt: true,
        estimatedDeadline: true,
        actualDeadline: true,
        matterTypeId: true,
      },
    });

    // Calculate stats per assignee
    const assigneeStats = new Map<number, {
      total: number;
      completed: number;
      overdue: number;
      onTime: number;
      totalDaysOpen: number;
      openCount: number;
    }>();

    // Initialize stats for all team members
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

    // Process matters
    const now = new Date();
    for (const matter of matters) {
      const userIds = matter.docketwiseUserIds?.split(',').map(id => parseInt(id.trim())) || [];
      
      for (const userId of userIds) {
        const stats = assigneeStats.get(userId);
        if (!stats) continue;

        stats.total++;
        
        // Check if completed
        const isCompleted = matter.closedAt || (matter.status || "").toLowerCase().includes("closed");
        if (isCompleted) {
          stats.completed++;
        }

        // Check if overdue
        if (matter.estimatedDeadline && !isCompleted) {
          const deadlineDate = new Date(matter.estimatedDeadline);
          if (deadlineDate < now) {
            stats.overdue++;
          }
        }

        // Check if completed on time
        if (isCompleted && matter.estimatedDeadline) {
          const completionDate = matter.actualDeadline ? new Date(matter.actualDeadline) : now;
          const deadlineDate = new Date(matter.estimatedDeadline);
          if (completionDate <= deadlineDate) {
            stats.onTime++;
          }
        }

        // Calculate days open
        if (matter.docketwiseCreatedAt) {
          const createdDate = new Date(matter.docketwiseCreatedAt);
          if (createdDate.getFullYear() > 1970) {
            const daysOpen = isCompleted
              ? matter.closedAt
                ? Math.ceil((new Date(matter.closedAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                : Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
              : Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            
            stats.totalDaysOpen += daysOpen;
            if (!isCompleted) {
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

        const onTimeRate = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;
        const avgDaysOpen = stats.openCount > 0 ? Math.round(stats.totalDaysOpen / stats.openCount) : 0;

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
      .filter((member) => member.matterCount > 0); // Only return members with matters
  });

// Get Recent Matters
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
        complexityWeight: true,
        billingRate: true,
      },
    });

    const matterTypeEstDaysMap = new Map<number, number>();
    for (const mt of matterTypes) {
      if (mt.estimatedDays) {
        matterTypeEstDaysMap.set(mt.docketwiseId, mt.estimatedDays);
      }
    }

    // Fetch local database data for assignedDate and other local fields
    const localMatters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        docketwiseId: {
          in: result.data.map(m => m.docketwiseId)
        }
      },
      select: {
        docketwiseId: true,
        assignedDate: true,
        estimatedDeadline: true,
        actualDeadline: true,
        totalHours: true,
      },
    });

    // Create a map for quick lookup
    const localMattersMap = new Map(
      localMatters.map(m => [m.docketwiseId, m])
    );

    // Calculate deadlines and hours for dashboard matters
    const mattersWithDeadlines = result.data.map((matter) => {
      let calculatedDeadline: Date | null = null;
      let isPastEstimatedDeadline = false;
      let daysUntilDeadline: number | undefined;
      let totalHoursElapsed: number | undefined;

      // Get local data for this matter
      const localMatter = localMattersMap.get(matter.docketwiseId);

      // Calculate deadline from docketwiseCreatedAt + estimatedDays
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
              
              // Calculate days until deadline (negative if overdue)
              const now = new Date();
              daysUntilDeadline = Math.ceil(
                (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
            }
          }
        }
      }

      // Calculate hours elapsed since assignment (from local database)
      if (localMatter?.assignedDate) {
        const assignedAt = new Date(localMatter.assignedDate);
        if (!isNaN(assignedAt.getTime()) && assignedAt.getFullYear() > 1970) {
          const now = new Date();
          totalHoursElapsed = Math.floor(
            (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60)
          );
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
        estimatedDeadline: localMatter?.estimatedDeadline || matter.estimatedDeadline,
        docketwiseCreatedAt: matter.docketwiseCreatedAt,
        assignedDate: localMatter?.assignedDate,
        updatedAt: matter.updatedAt,
        calculatedDeadline,
        isPastEstimatedDeadline,
        totalHoursElapsed,
        daysUntilDeadline,
        estimatedDays: matterTypeEstDaysMap.get(matter.matterTypeId || 0) || null,
      };
    });

    return mattersWithDeadlines;
  });

// Get Matter Status Distribution
export const getMatterStatusDistribution = authorized
  .route({
    method: "GET",
    path: "/dashboard/status-distribution",
    summary: "Get matter status distribution",
    tags: ["Dashboard"],
  })
  .output(z.array(statusDistributionSchema))
  .handler(async ({ context }) => {
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
    summary: "Get matter type distribution",
    tags: ["Dashboard"],
  })
  .output(z.array(typeDistributionSchema))
  .handler(async ({ context }) => {
    const typeGroups = await prisma.matters.groupBy({
      by: ["matterType"],
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      _count: true,
    });

    return typeGroups.map((group) => ({
      type: group.matterType || "Unknown",
      count: group._count,
    }));
  });
