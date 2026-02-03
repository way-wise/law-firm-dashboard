import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { classifyStatus, isMatterOverdue } from "@/lib/status-classifier";
import { categorizeStatus } from "@/lib/utils/status-categories";
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
  activeMattersCount: z.number(), // Simple count of active (non-closed) matters
  newMattersThisMonth: z.number(), // Matters created this month
  criticalMatters: z.number(), // Matters with deadline close or passed
  rfeFrequency: z.number(), // RFE count this period
  newMattersGrowth: z.string().optional(), // Growth text like "+5 from last month"
  weightedActiveMatters: z.number(), // Active matters weighted by complexity
  revenueAtRisk: z.number(), // Revenue from matters due in next 14 days
  deadlineComplianceRate: z.number(), // Percentage of matters completed on time
  avgCycleTime: z.number(), // Average days from creation to completion
  paralegalUtilization: z.number(), // Average team utilization percentage

  // Status Group Counts (Dynamic)
  statusGroupCounts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    count: z.number(),
    color: z.string().nullable(),
    isSystem: z.boolean(),
  })),
  staleMattersCount: z.number(), // Matters not updated in staleMeasurementDays

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

  // Data Quality Metrics
  mattersWithoutPricing: z.number(), // Matters missing both flatFee and matterType flatFee
  mattersWithoutDeadline: z.number(), // Matters missing estimatedDeadline
  mattersWithoutMatterType: z.number(), // Matters missing matterTypeId
  dataQualityScore: z.number(), // Overall data quality percentage (0-100)
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
  performanceIndex: z.number(), // 0-100 score
  rfeRate: z.number(),
  revisionRate: z.number(),
  utilization: z.number(),
  avgCycleTime: z.number(),
  activeMatters: z.number(),
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
  deadline: z.date().nullable(),
  calculatedDeadline: z.date().nullable().optional(),
  isPastDeadline: z.boolean().optional(),
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

// Dashboard stats input schema
const dashboardStatsInputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Get Dashboard Stats - Always calculated in real-time from database
export const getDashboardStats = authorized
  .route({
    method: "GET",
    path: "/dashboard/stats",
    summary: "Get dashboard statistics calculated in real-time",
    tags: ["Dashboard"],
  })
  .input(dashboardStatsInputSchema)
  .output(dashboardStatsSchema)
  .handler(async ({ context }) => {
    console.log("[DASHBOARD] Calculating stats in real-time from database");
    
    // === CALCULATE ALL STATS IN REAL-TIME ===
    
    // Basic counts
    const totalContacts = await prisma.contacts.count();
    // Total Matters = count of all matters for this user (no other filters)
    const totalMatters = await prisma.matters.count({
      where: { userId: context.user.id },
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
          statusForFiling: true,
          statusId: true,
          statusForFilingId: true,
          closedAt: true,
          deadline: true,
          docketwiseCreatedAt: true,
          docketwiseUpdatedAt: true,
          createdAt: true,
          billingStatus: true,
          totalHours: true,
          flatFee: true,
          assignees: true,
          docketwiseUserIds: true,
          teamId: true,
          matterTypeId: true,
          rfeCount: true,
          revisionCount: true,
          errorCount: true,
        },
      }),
      // Matter types with complexity and flat fees
      prisma.matterTypes.findMany({
        select: { 
          id: true,
          docketwiseId: true, 
          estimatedDays: true,
          complexityWeight: true,
          flatFee: true,
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
    
    // Filter active matters (non-closed)
    const activeMatters = allMatters.filter(
      matter => !matter.closedAt && !(matter.status || "").toLowerCase().includes("closed")
    );
    
    // 1. Active Matters Count (simple count)
    const activeMattersCount = activeMatters.length;
    
    // 2. New Matters This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newMattersThisMonth = allMatters.filter(m => {
      const createdDate = m.docketwiseCreatedAt || m.createdAt;
      if (!createdDate) return false;
      const date = new Date(createdDate);
      return date >= startOfMonth;
    }).length;
    
    // 3. New Matters Last Month (for growth calculation)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const newMattersLastMonth = allMatters.filter(m => {
      const createdDate = m.docketwiseCreatedAt || m.createdAt;
      if (!createdDate) return false;
      const date = new Date(createdDate);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length;
    
    const growthDiff = newMattersThisMonth - newMattersLastMonth;
    const newMattersGrowth = growthDiff >= 0 
      ? `+${growthDiff} from last month` 
      : `${growthDiff} from last month`;
    
    // 4. Critical Matters (deadline within 7 days or passed)
    const criticalMatters = allMatters.filter(m => {
      if (!m.deadline) return false;
      const daysUntil = Math.ceil((new Date(m.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7; // includes overdue (negative) and upcoming
    }).length;
    
    // 5. RFE Frequency (count of matters with RFE in status or statusForFiling)
    // Note: statusForFiling is the Docketwise "Status For Filing" column where RFE status is stored
    const rfeFrequency = allMatters.filter(m => {
      const statusForFiling = (m.statusForFiling || "").toLowerCase();
      const status = (m.status || "").toLowerCase();
      // Match any variation of RFE status
      return statusForFiling.includes("request for evidence") || 
             statusForFiling.includes("rfe") ||
             status.includes("request for evidence") ||
             status.includes("rfe");
    }).length;
    
    // 6. Weighted Active Matters (complexity weighted)
    const weightedActiveMatters = activeMatters.reduce((total, matter) => {
      const complexity = matterTypeMap.get(matter.matterTypeId || 0)?.complexityWeight || 1;
      return total + complexity;
    }, 0);

    // === STATUS GROUP COUNTS ===
    
    // Fetch all status groups for this user
    const statusGroups = await prisma.statusGroups.findMany({
      where: {
        userId: context.user.id,
        isActive: true,
      },
      include: {
        statusGroupMappings: {
          select: {
            matterStatus: {
              select: { docketwiseId: true },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Calculate counts for each status group
    const statusGroupCounts = await Promise.all(
      statusGroups.map(async (group) => {
        const docketwiseStatusIds = group.statusGroupMappings.map(
          (mapping) => mapping.matterStatus.docketwiseId
        );

        const count = await prisma.matters.count({
          where: {
            userId: context.user.id,
            archived: false,
            discardedAt: null,
            OR: [
              { statusId: { in: docketwiseStatusIds } },
              { statusForFilingId: { in: docketwiseStatusIds } },
            ],
          },
        });

        return {
          id: group.id,
          name: group.name,
          count,
          color: group.color,
          isSystem: group.isSystem,
        };
      })
    );

    // Calculate stale matters count
    const syncSettings = await prisma.syncSettings.findUnique({
      where: { userId: context.user.id },
      select: { staleMeasurementDays: true },
    });
    const staleMeasurementDays = syncSettings?.staleMeasurementDays || 10;
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleMeasurementDays);
    
    const staleMattersCount = await prisma.matters.count({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        docketwiseUpdatedAt: { lte: staleDate },
      },
    });

    // 7. Revenue at Risk (matters due in next 14 days)
    const next14Days = new Date();
    next14Days.setDate(next14Days.getDate() + 14);
    
    const revenueAtRisk = allMatters
      .filter(matter => {
        if (!matter.matterTypeId) return false;
        const deadline = matter.deadline;
        if (!deadline) return false;
        const deadlineDate = new Date(deadline);
        return deadlineDate <= next14Days && deadlineDate >= now;
      })
      .reduce((total, matter) => {
        const matterType = matterTypeMap.get(matter.matterTypeId || 0);
        const flatFee = matterType?.flatFee;
        // Skip matters without flat fees for revenue calculations
        if (flatFee === null || flatFee === undefined) return total;
        return total + flatFee;
      }, 0);

    // 3. Deadline Compliance Rate
    const completedWithDeadlines = allMatters.filter(m => 
      m.closedAt && m.deadline
    );
    const onTimeDeliveries = completedWithDeadlines.filter(m => 
      new Date(m.closedAt!) <= new Date(m.deadline!)
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
      if (!m.deadline) return false;
      return new Date(m.deadline) < now;
    }).length;

    const atRiskMatters = allMatters.filter(m => {
      if (!m.deadline) return false;
      const daysUntil = Math.ceil((new Date(m.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 7;
    }).length;

    // Unassigned matters - count matters for this user without assignees
    const unassignedMatters = await prisma.matters.count({
      where: {
        userId: context.user.id,
        OR: [
          { assignees: null },
          { assignees: "" },
        ],
      },
    });

    const overloadedParalegals = paralegals.filter(paralegal => {
      const assignedMatters = allMatters.filter(m => m.teamId === paralegal.docketwiseId);
      const billableHours = assignedMatters.reduce((sum, m) => sum + (m.totalHours || 0), 0);
      const availableHours = (paralegal.availableHoursPerWeek || 0) * 4;
      const utilization = availableHours > 0 ? (billableHours / availableHours) * 100 : 0;
      return utilization > 90;
    }).length;

    // Financial metrics - using flat fees instead of hourly rates
    const totalRevenue = allMatters.reduce((sum, m) => {
      // Use matter-specific flat fee first, then fall back to matter type flat fee
      if (m.flatFee !== null && m.flatFee !== undefined) {
        return sum + m.flatFee;
      }
      if (!m.matterTypeId) return sum;
      const matterType = matterTypeMap.get(m.matterTypeId || 0);
      const flatFee = matterType?.flatFee;
      // Skip matters without flat fees for revenue calculations
      if (flatFee === null || flatFee === undefined) return sum;
      return sum + flatFee;
    }, 0);

    const pendingRevenue = allMatters
      .filter(m => m.billingStatus !== "PAID")
      .reduce((sum, m) => {
        // Use matter-specific flat fee first, then fall back to matter type flat fee
        if (m.flatFee !== null && m.flatFee !== undefined) {
          return sum + m.flatFee;
        }
        if (!m.matterTypeId) return sum;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        const flatFee = matterType?.flatFee;
        // Skip matters without flat fees for revenue calculations
        if (flatFee === null || flatFee === undefined) return sum;
        return sum + flatFee;
      }, 0);

    const collectedRevenue = allMatters
      .filter(m => m.billingStatus === "PAID")
      .reduce((sum, m) => {
        // Use matter-specific flat fee first, then fall back to matter type flat fee
        if (m.flatFee !== null && m.flatFee !== undefined) {
          return sum + m.flatFee;
        }
        if (!m.matterTypeId) return sum;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        const flatFee = matterType?.flatFee;
        // Skip matters without flat fees for revenue calculations
        if (flatFee === null || flatFee === undefined) return sum;
        return sum + flatFee;
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

    // Calculate real period-over-period trends
    
    // Matters trend: compare this month vs last month new matters
    const mattersTrend = newMattersLastMonth > 0 
      ? Math.round(((newMattersThisMonth - newMattersLastMonth) / newMattersLastMonth) * 100)
      : newMattersThisMonth > 0 ? 100 : 0;

    // Revenue trend: compare this month's closed matters revenue vs last month
    const thisMonthClosedRevenue = allMatters
      .filter(m => {
        if (!m.closedAt) return false;
        const closedDate = new Date(m.closedAt);
        return closedDate >= startOfMonth;
      })
      .reduce((sum, m) => {
        if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        return sum + (matterType?.flatFee || 0);
      }, 0);

    const lastMonthClosedRevenue = allMatters
      .filter(m => {
        if (!m.closedAt) return false;
        const closedDate = new Date(m.closedAt);
        return closedDate >= startOfLastMonth && closedDate <= endOfLastMonth;
      })
      .reduce((sum, m) => {
        if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        return sum + (matterType?.flatFee || 0);
      }, 0);

    const revenueTrend = lastMonthClosedRevenue > 0
      ? Math.round(((thisMonthClosedRevenue - lastMonthClosedRevenue) / lastMonthClosedRevenue) * 100)
      : thisMonthClosedRevenue > 0 ? 100 : 0;

    // Deadline miss trend: compare overdue matters this month vs last month
    const thisMonthOverdue = allMatters.filter(m => {
      if (!m.deadline) return false;
      const deadline = new Date(m.deadline);
      return deadline < now && deadline >= startOfMonth;
    }).length;

    const lastMonthOverdue = allMatters.filter(m => {
      if (!m.deadline) return false;
      const deadline = new Date(m.deadline);
      return deadline >= startOfLastMonth && deadline <= endOfLastMonth && deadline < now;
    }).length;

    const deadlineMissTrend = lastMonthOverdue > 0
      ? Math.round(((thisMonthOverdue - lastMonthOverdue) / lastMonthOverdue) * 100)
      : thisMonthOverdue > 0 ? 100 : 0;

    // Data Quality Metrics
    const mattersWithoutPricing = allMatters.filter(m => {
      const hasMatterFee = m.flatFee !== null && m.flatFee !== undefined;
      if (hasMatterFee) return false;
      if (!m.matterTypeId) return true;
      const matterType = matterTypeMap.get(m.matterTypeId);
      const hasTypeFee = matterType?.flatFee !== null && matterType?.flatFee !== undefined;
      return !hasTypeFee;
    }).length;

    const mattersWithoutDeadline = allMatters.filter(m => !m.deadline).length;
    const mattersWithoutMatterType = allMatters.filter(m => !m.matterTypeId).length;

    // Calculate data quality score (percentage of matters with complete data)
    const totalMattersCount = Math.max(allMatters.length, 1);
    const mattersWithPricing = totalMattersCount - mattersWithoutPricing;
    const mattersWithDeadline = totalMattersCount - mattersWithoutDeadline;
    const mattersWithMatterType = totalMattersCount - mattersWithoutMatterType;
    const mattersWithTeamId = allMatters.filter(m => m.teamId !== null).length;
    
    // Quality score: average of completeness percentages for critical fields
    const dataQualityScore = Math.round(
      ((mattersWithPricing / totalMattersCount) * 100 +
       (mattersWithDeadline / totalMattersCount) * 100 +
       (mattersWithMatterType / totalMattersCount) * 100 +
       (mattersWithTeamId / totalMattersCount) * 100) / 4
    );

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
      activeMattersCount,
      newMattersThisMonth,
      criticalMatters,
      rfeFrequency,
      newMattersGrowth,
      weightedActiveMatters,
      revenueAtRisk,
      deadlineComplianceRate,
      avgCycleTime,
      paralegalUtilization,

      // Status Group Counts
      statusGroupCounts,
      staleMattersCount,

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

      // Data Quality Metrics
      mattersWithoutPricing,
      mattersWithoutDeadline,
      mattersWithoutMatterType,
      dataQualityScore,
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

    // Build name-to-id map for matching by assignee name
    const nameToIdMap = new Map<string, number>();
    for (const member of teamMembers) {
      const fullName = member.fullName || `${member.firstName || ""} ${member.lastName || ""}`.trim();
      if (fullName) {
        nameToIdMap.set(fullName.toLowerCase(), member.docketwiseId);
        if (member.firstName) {
          nameToIdMap.set(member.firstName.toLowerCase(), member.docketwiseId);
        }
      }
      if (member.email) {
        nameToIdMap.set(member.email.toLowerCase(), member.docketwiseId);
      }
    }

    // Fetch matters from DATABASE (no API calls!)
    const matters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      select: {
        id: true,
        assignees: true,
        docketwiseUserIds: true,
        teamId: true,
        closedAt: true,
        deadline: true,
        docketwiseCreatedAt: true,
        docketwiseUpdatedAt: true,
        createdAt: true,
        status: true,
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

    // Track unassigned matters count
    let unassignedCount = 0;

    // Process matters using realtime data which has assignee info
    const now = new Date();
    for (const matter of matters) {
      // Get user IDs from docketwiseUserIds (comma-separated string from API)
      const userIdsStr = matter.docketwiseUserIds || "";
      let userIds: number[] = [];
      
      // Parse docketwiseUserIds - could be JSON array or comma-separated
      if (userIdsStr.startsWith('[')) {
        try {
          userIds = JSON.parse(userIdsStr).filter((id: number) => !isNaN(id));
        } catch {
          userIds = [];
        }
      } else if (userIdsStr) {
        userIds = userIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }
      
      // Also include teamId if present
      if (matter.teamId && !userIds.includes(matter.teamId)) {
        userIds.push(matter.teamId);
      }
      
      // Fallback: match by assignees string (name matching)
      if (userIds.length === 0 && matter.assignees) {
        const assigneeNames = matter.assignees.split(',').map(n => n.trim());
        for (const name of assigneeNames) {
          let matchedId = nameToIdMap.get(name.toLowerCase());
          if (!matchedId) {
            const firstName = name.split(' ')[0].toLowerCase();
            matchedId = nameToIdMap.get(firstName);
          }
          if (matchedId && !userIds.includes(matchedId)) {
            userIds.push(matchedId);
          }
        }
      }
      
      // Track unassigned
      if (userIds.length === 0) {
        unassignedCount++;
      }
      
      for (const userId of userIds) {
        const stats = assigneeStats.get(userId);
        if (!stats) continue;

        stats.total++;
        
        // Use status classifier for accurate completion check
        const classification = classifyStatus(matter.status);
        const isCompleted = classification.isCompleted || matter.closedAt;
        
        if (isCompleted) {
          stats.completed++;
        }

        // Check if overdue using status classifier (excludes closed/filed/approved)
        if (isMatterOverdue(matter.deadline, matter.status)) {
          stats.overdue++;
        }

        // Check if completed on time
        const deadline = matter.deadline;
        if (isCompleted && deadline) {
          const completionDate = matter.closedAt ? new Date(matter.closedAt) : now;
          const deadlineDate = new Date(deadline);
          if (completionDate <= deadlineDate) {
            stats.onTime++;
          }
        }

        // Calculate days open
        if (matter.docketwiseCreatedAt) {
          const createdDate = new Date(matter.docketwiseCreatedAt);
          if (createdDate.getFullYear() > 1970) {
            const daysOpen = isCompleted && matter.closedAt
              ? Math.ceil((new Date(matter.closedAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
              : Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            
            stats.totalDaysOpen += daysOpen;
            if (!isCompleted) {
              stats.openCount++;
            }
          }
        }
      }
    }
    
    console.log(`[ASSIGNEE-STATS] Processed ${matters.length} matters, ${unassignedCount} unassigned`);

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

        // Calculate additional performance metrics
        const activeMatters = stats.total - stats.completed;
        const avgCycleTime = stats.completed > 0 ? Math.round(stats.totalDaysOpen / stats.completed) : 0;
        
        // Quality metrics from matter data (would need to query separately for real data)
        const rfeRate = 0; // Placeholder - needs matter.rfeCount
        const revisionRate = 0; // Placeholder - needs matter.revisionCount
        
        // Utilization (estimated based on active matters)
        const utilization = activeMatters > 0 ? Math.min(100, (activeMatters / 50) * 100) : 0;
        
        // Performance Index calculation
        const performanceIndex = Math.round(
          (onTimeRate * 0.4) + 
          (Math.max(0, 100 - avgDaysOpen) * 0.3) +
          (Math.min(utilization, 85) * 0.2) +
          (Math.max(0, 100 - rfeRate * 10) * 0.1)
        );

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
          performanceIndex,
          rfeRate,
          revisionRate,
          utilization,
          avgCycleTime,
          activeMatters,
        };
      })
      .sort((a, b) => b.matterCount - a.matterCount) // Sort by matter count descending
      .slice(0, 10); // Limit to top 10 team members
  });

// Get Matter Distribution for Charts
export const getMatterDistribution = authorized
  .route({
    method: "GET",
    path: "/dashboard/distribution",
    summary: "Get matter distribution by type, complexity, and status",
    tags: ["Dashboard"],
  })
  .output(z.object({
    byType: z.array(z.object({ type: z.string(), count: z.number() })),
    byComplexity: z.array(z.object({ level: z.string(), count: z.number() })),
    byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
  }))
  .handler(async ({ context }) => {
    const matters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      select: {
        matterType: true,
        matterTypeId: true,
        status: true,
      },
    });

    // Get matter types with complexity
    const matterTypes = await prisma.matterTypes.findMany({
      select: {
        docketwiseId: true,
        name: true,
        complexityWeight: true,
      },
    });
    const matterTypeComplexityMap = new Map(
      matterTypes.map(mt => [mt.docketwiseId, { name: mt.name, complexity: mt.complexityWeight }])
    );

    // By Type
    const typeCount = new Map<string, number>();
    for (const matter of matters) {
      const type = matter.matterType || "Unknown";
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }
    const byType = Array.from(typeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    // By Complexity
    const complexityCount = new Map<string, number>();
    for (const matter of matters) {
      const typeInfo = matterTypeComplexityMap.get(matter.matterTypeId || 0);
      let level = "Simple";
      if (typeInfo) {
        if (typeInfo.complexity >= 3) level = "Complex";
        else if (typeInfo.complexity >= 2) level = "Medium";
      }
      complexityCount.set(level, (complexityCount.get(level) || 0) + 1);
    }
    const byComplexity = Array.from(complexityCount.entries())
      .map(([level, count]) => ({ level, count }));

    // By Status
    const statusCount = new Map<string, number>();
    for (const matter of matters) {
      const status = matter.status || "Unknown";
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    }
    const byStatus = Array.from(statusCount.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    return {
      byType,
      byComplexity,
      byStatus,
    };
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
    // Fetch matters from DATABASE (no API calls!) - ordered by most recently updated
    const matters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      orderBy: {
        docketwiseUpdatedAt: 'desc',
      },
      take: input.limit,
      select: {
        id: true,
        docketwiseId: true,
        title: true,
        clientName: true,
        matterType: true,
        matterTypeId: true,
        status: true,
        statusForFiling: true,
        assignees: true,
        billingStatus: true,
        deadline: true,
        docketwiseCreatedAt: true,
        docketwiseUpdatedAt: true,
        assignedDate: true,
        updatedAt: true,
      },
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

    // Calculate deadlines and hours for dashboard matters
    const mattersWithDeadlines = matters.map((matter) => {
      let calculatedDeadline: Date | null = null;
      let isPastDeadline = false;
      let daysUntilDeadline: number | undefined;
      let totalHoursElapsed: number | undefined;

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
              isPastDeadline = new Date() > calculatedDeadline;
              
              // Calculate days until deadline (negative if overdue)
              const now = new Date();
              daysUntilDeadline = Math.ceil(
                (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
            }
          }
        }
      }

      // Calculate hours elapsed since assignment
      if (matter.assignedDate) {
        const assignedAt = new Date(matter.assignedDate);
        if (!isNaN(assignedAt.getTime()) && assignedAt.getFullYear() > 1970) {
          const now = new Date();
          totalHoursElapsed = Math.floor(
            (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60)
          );
        }
      }

      // Sanitize deadline - if it's 1970, treat as null
      let deadline = matter.deadline;
      if (deadline) {
        const date = new Date(deadline);
        if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
          deadline = null;
        }
      }

      return {
        id: matter.id,
        docketwiseId: matter.docketwiseId,
        title: matter.title,
        clientName: matter.clientName,
        matterType: matter.matterType,
        matterTypeId: matter.matterTypeId,
        status: matter.status,
        statusForFiling: matter.statusForFiling,
        assignees: matter.assignees,
        billingStatus: matter.billingStatus,
        deadline: deadline,
        docketwiseCreatedAt: matter.docketwiseCreatedAt,
        assignedDate: matter.assignedDate,
        updatedAt: matter.updatedAt,
        calculatedDeadline,
        isPastDeadline,
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

// Monthly trends schema for adjudication chart
const monthlyTrendSchema = z.object({
  month: z.string(), // "Jan", "Feb", etc.
  year: z.number(),
  newMatters: z.number(),
  approved: z.number(), // Closed/completed matters
  rfe: z.number(), // Matters with RFE status or rfeCount > 0
});

// Get Monthly Trends for Adjudication Chart
export const getMonthlyTrends = authorized
  .route({
    method: "GET",
    path: "/dashboard/monthly-trends",
    summary: "Get monthly trends for adjudication chart (new matters, approved, RFE)",
    tags: ["Dashboard"],
  })
  .input(z.object({
    months: z.number().optional().default(6), // How many months to look back
  }))
  .output(z.array(monthlyTrendSchema))
  .handler(async ({ input, context }) => {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Get all matters for this user
    const allMatters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      select: {
        docketwiseCreatedAt: true,
        createdAt: true,
        closedAt: true,
        status: true,
        statusForFiling: true,
        rfeCount: true,
      },
    });

    // Calculate trends for each month
    const trends: Array<{ month: string; year: number; newMatters: number; approved: number; rfe: number }> = [];
    
    for (let i = input.months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = monthNames[monthDate.getMonth()];
      const year = monthDate.getFullYear();

      // New matters created in this month
      const newMatters = allMatters.filter(m => {
        const createdDate = m.docketwiseCreatedAt || m.createdAt;
        if (!createdDate) return false;
        const date = new Date(createdDate);
        return date >= monthDate && date <= monthEnd;
      }).length;

      // Approved/Closed matters in this month
      const approved = allMatters.filter(m => {
        if (!m.closedAt) return false;
        const closedDate = new Date(m.closedAt);
        return closedDate >= monthDate && closedDate <= monthEnd;
      }).length;

      // RFE count - sum of rfeCount for matters created in this month
      // Plus count matters with RFE in status that were created this month
      const rfe = allMatters.reduce((count, m) => {
        const createdDate = m.docketwiseCreatedAt || m.createdAt;
        if (!createdDate) return count;
        const date = new Date(createdDate);
        if (date < monthDate || date > monthEnd) return count;
        
        // Add rfeCount if present
        if (m.rfeCount && m.rfeCount > 0) {
          return count + m.rfeCount;
        }
        
        // Or count as 1 if status contains RFE
        if ((m.status && m.status.toLowerCase().includes('rfe')) ||
            (m.statusForFiling && m.statusForFiling.toLowerCase().includes('rfe'))) {
          return count + 1;
        }
        
        return count;
      }, 0);

      trends.push({ month: monthName, year, newMatters, approved, rfe });
    }

    return trends;
  });

// Status category schema for workflow tracking
const statusCategorySchema = z.object({
  category: z.string(), // "approved", "rfe", "denied", "pending", "interview", "filed", "other"
  count: z.number(),
  statuses: z.array(z.object({
    statusId: z.number(),
    statusName: z.string(),
    matterCount: z.number(),
  })),
});

// Get Status Distribution by Category
export const getStatusDistribution = authorized
  .route({
    method: "GET",
    path: "/dashboard/status-distribution",
    summary: "Get matter distribution by status category using matterStatuses table",
    tags: ["Dashboard"],
  })
  .output(z.array(statusCategorySchema))
  .handler(async ({ context }) => {
    // Get all matters with their status IDs
    const matters = await prisma.matters.findMany({
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
      },
      select: {
        statusId: true,
        status: true,
      },
    });

    // Get all matter statuses for reference
    const allStatuses = await prisma.matterStatuses.findMany({
      select: {
        docketwiseId: true,
        name: true,
      },
    });

    // Create a map of statusId -> statusName
    const statusMap = new Map<number, string>();
    for (const status of allStatuses) {
      statusMap.set(status.docketwiseId, status.name);
    }

    // Count matters by status
    const statusCounts = new Map<number, { name: string; count: number }>();
    
    for (const matter of matters) {
      if (matter.statusId) {
        const existing = statusCounts.get(matter.statusId);
        const statusName = statusMap.get(matter.statusId) || matter.status || 'Unknown';
        if (existing) {
          existing.count++;
        } else {
          statusCounts.set(matter.statusId, { name: statusName, count: 1 });
        }
      } else if (matter.status) {
        // Fallback to status string if no statusId - use string as key directly
        // We'll use a negative hash to avoid collision with real IDs
        let hash = 0;
        for (let i = 0; i < matter.status.length; i++) {
          hash = ((hash << 5) - hash) + matter.status.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        const fakeId = -Math.abs(hash || 1);
        const existing = statusCounts.get(fakeId);
        if (existing) {
          existing.count++;
        } else {
          statusCounts.set(fakeId, { name: matter.status, count: 1 });
        }
      }
    }

    // Group by category
    const categoryGroups = new Map<string, { count: number; statuses: Array<{ statusId: number; statusName: string; matterCount: number }> }>();
    
    for (const [statusId, { name, count }] of statusCounts) {
      const category = categorizeStatus(name);
      const existing = categoryGroups.get(category);
      if (existing) {
        existing.count += count;
        existing.statuses.push({ statusId, statusName: name, matterCount: count });
      } else {
        categoryGroups.set(category, {
          count,
          statuses: [{ statusId, statusName: name, matterCount: count }],
        });
      }
    }

    // Convert to array and sort by count
    return Array.from(categoryGroups.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        statuses: data.statuses.sort((a, b) => b.matterCount - a.matterCount),
      }))
      .sort((a, b) => b.count - a.count);
  });

// Get All Matter Statuses with their Matter Types (for reference/debugging)
export const getMatterStatusesByType = authorized
  .route({
    method: "GET",
    path: "/dashboard/matter-statuses-by-type",
    summary: "Get all matter statuses grouped by matter type",
    tags: ["Dashboard"],
  })
  .output(z.array(z.object({
    matterTypeId: z.number(),
    matterTypeName: z.string(),
    statuses: z.array(z.object({
      id: z.number(),
      name: z.string(),
      category: z.string(),
      matterCount: z.number(),
    })),
  })))
  .handler(async ({ context }) => {
    // Get all matter types with their statuses
    const matterTypes = await prisma.matterTypes.findMany({
      include: {
        matterStatuses: true,
      },
    });

    // Get matter counts by statusId for this user
    const matterCounts = await prisma.matters.groupBy({
      by: ['statusId'],
      where: {
        userId: context.user.id,
        archived: false,
        discardedAt: null,
        statusId: { not: null },
      },
      _count: true,
    });

    const countMap = new Map<number, number>();
    for (const item of matterCounts) {
      if (item.statusId) {
        countMap.set(item.statusId, item._count);
      }
    }

    return matterTypes.map(mt => ({
      matterTypeId: mt.docketwiseId,
      matterTypeName: mt.name,
      statuses: mt.matterStatuses.map(status => ({
        id: status.docketwiseId,
        name: status.name,
        category: categorizeStatus(status.name),
        matterCount: countMap.get(status.docketwiseId) || 0,
      })),
    })).filter(mt => mt.statuses.length > 0); // Only return types with statuses
  });
