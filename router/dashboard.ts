import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import * as z from "zod";

// Enhanced dashboard stats schema - comprehensive KPIs
const dashboardStatsSchema = z.object({
  totalContacts: z.number(),
  totalMatters: z.number(),
  totalMatterTypes: z.number(),
  teamMembers: z.number(),
  categories: z.number(),
  activeTeamMembers: z.number(),
  matterTypesWithWorkflow: z.number(),
  editedMatters: z.number(),
  activeMattersCount: z.number(),
  newMattersThisMonth: z.number(),
  criticalMatters: z.number(),
  rfeFrequency: z.number(),
  newMattersGrowth: z.string().optional(),
  weightedActiveMatters: z.number(),
  revenueAtRisk: z.number(),
  deadlineComplianceRate: z.number(),
  avgCycleTime: z.number(),
  paralegalUtilization: z.number(),
  statusGroupCounts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    count: z.number(),
    color: z.string().nullable(),
    isSystem: z.boolean(),
  })),
  staleMattersCount: z.number(),
  overdueMatters: z.number(),
  atRiskMatters: z.number(),
  unassignedMatters: z.number(),
  overloadedParalegals: z.number(),
  avgDaysToFile: z.number(),
  caseValue: z.number(),
  totalRevenue: z.number(),
  pendingRevenue: z.number(),
  collectedRevenue: z.number(),
  averageMatterValue: z.number(),
  matterVelocity: z.number(),
  onTimeRate: z.number(),
  teamUtilization: z.number(),
  avgRfeRate: z.number(),
  totalReworkCount: z.number(),
  qualityScore: z.number(),
  totalAvailableHours: z.number(),
  totalAssignedHours: z.number(),
  totalBillableHours: z.number(),
  mattersTrend: z.number().optional(),
  revenueTrend: z.number().optional(),
  deadlineMissTrend: z.number().optional(),
  mattersWithoutPricing: z.number(),
  mattersWithoutDeadline: z.number(),
  mattersWithoutMatterType: z.number(),
  dataQualityScore: z.number(),
});

const assigneeStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  matterCount: z.number(),
  completedCount: z.number(),
  overdueCount: z.number(),
  onTimeRate: z.number(),
  avgDaysOpen: z.number(),
  performanceIndex: z.number(),
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
  docketwiseUpdatedAt: z.date().nullable(),
  assignedDate: z.date().nullable().optional(),
  updatedAt: z.date(),
  totalHoursElapsed: z.number().optional(), // Hours since assignment
  daysUntilDeadline: z.number().optional(), // Days until calculated deadline
  estimatedDays: z.number().nullable().optional(),
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
  .handler(async ({ context, input }) => {
    // Parse date range from input
    const dateFrom = input.dateFrom ? new Date(input.dateFrom) : null;
    const dateTo = input.dateTo ? new Date(input.dateTo + 'T23:59:59.999Z') : null;
    
    console.log("[DASHBOARD] Date range:", { 
      inputFrom: input.dateFrom, 
      inputTo: input.dateTo,
      parsedFrom: dateFrom?.toISOString(), 
      parsedTo: dateTo?.toISOString() 
    });
    
    // === CALCULATE ALL STATS IN REAL-TIME ===
    
    // Basic counts
    const totalContacts = await prisma.contacts.count();
    // Total Matters = count of ALL matters in database (no filters)
    const totalMatters = await prisma.matters.count();
    const categories = await prisma.categories.count();
    const totalMatterTypes = await prisma.matterTypes.count();
    const matterTypesWithWorkflow = await prisma.matterTypes.count({
      where: {
        matterStatuses: {
          some: {},
        },
      },
    });
    const activeTeamMembers = await prisma.teams.count({
      where: { isActive: true },
    });
    const editedMatters = await prisma.matters.count({
      where: {
        isEdited: true,
      },
    });

    // === COMPREHENSIVE DATA FETCH ===
    
    // Get comprehensive data for KPI calculations
    const [allMatters, matterTypesFull, paralegals] = await Promise.all([
      // All matters with full data - no hidden filters
      prisma.matters.findMany({
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
    
    // 2. New Matters in Date Range (based on docketwiseCreatedAt)
    const newMattersThisMonth = allMatters.filter(m => {
      const createdDate = m.docketwiseCreatedAt;
      if (!createdDate) return false;
      const date = new Date(createdDate);
      
      // Filter by date range if provided
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      
      return true;
    }).length;
    
    // 3. Calculate growth trend - compare with previous 30 days
    let mattersTrend = 0;
    let newMattersGrowth = "";
    
    if (dateFrom && dateTo) {
      // Previous 30 days period
      const prev30DaysFrom = new Date(dateFrom.getTime() - (30 * 24 * 60 * 60 * 1000));
      const prev30DaysTo = new Date(dateFrom.getTime() - 1);
      
      const prev30DayMatters = allMatters.filter(m => {
        const createdDate = m.docketwiseCreatedAt;
        if (!createdDate) return false;
        const date = new Date(createdDate);
        return date >= prev30DaysFrom && date <= prev30DaysTo;
      }).length;
      
      const diff = newMattersThisMonth - prev30DayMatters;
      
      if (prev30DayMatters > 0) {
        mattersTrend = Math.round((diff / prev30DayMatters) * 100);
        newMattersGrowth = diff >= 0 
          ? `+${diff} from previous 30 days` 
          : `${diff} from previous 30 days`;
      } else {
        newMattersGrowth = `+${diff} from previous 30 days`;
      }
    }
    
    // 4. Critical Matters (deadline within 7 days or passed)
    const criticalMatters = allMatters.filter(m => {
      if (!m.deadline) return false;
      const daysUntil = Math.ceil((new Date(m.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7; // includes overdue (negative) and upcoming
    }).length;
    
    // 5. AVG Monthly RFE - average RFEs per month over last 3 months (not dependent on date range)
    // Get RFE status group to find all RFE statuses
    const rfeStatusGroup = await prisma.statusGroups.findFirst({
      where: {
        userId: context.user.id,
        name: { equals: 'RFE', mode: 'insensitive' },
      },
      include: {
        statusGroupMappings: {
          select: {
            matterStatus: { select: { docketwiseId: true, name: true } },
          },
        },
      },
    });
    
    let rfeFrequency = 0;
    if (rfeStatusGroup) {
      const rfeStatusIds = rfeStatusGroup.statusGroupMappings.map(
        (m) => m.matterStatus.docketwiseId
      );
      const rfeStatusNames = rfeStatusGroup.statusGroupMappings.map(
        (m) => m.matterStatus.name
      );
      
      // Get RFE matters from last 3 months (based on docketwiseUpdatedAt)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const rfeMattersLast3Months = allMatters.filter(m => {
        // Check if matter has RFE status
        const hasRFEStatus = rfeStatusIds.includes(m.statusId || 0) || 
                            rfeStatusIds.includes(m.statusForFilingId || 0);
        
        // Also handle NULL statusId cases by matching status text
        const hasRFEText = (m.statusId === null && rfeStatusNames.some(name => m.status === name)) ||
                          (m.statusForFilingId === null && rfeStatusNames.some(name => m.statusForFiling === name));
        
        if (!hasRFEStatus && !hasRFEText) return false;
        
        // Filter by docketwiseUpdatedAt in last 3 months
        const updatedDate = m.docketwiseUpdatedAt;
        if (!updatedDate) return false;
        const date = new Date(updatedDate);
        return date >= threeMonthsAgo && date <= now;
      }).length;
      
      // Calculate average per month (divide by 3)
      rfeFrequency = Math.round(rfeMattersLast3Months / 3);
    }
    
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
              select: { docketwiseId: true, name: true },
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
        
        const statusNames = group.statusGroupMappings.map(
          (mapping) => mapping.matterStatus.name
        );

        const count = await prisma.matters.count({
          where: {
            OR: [
              { statusId: { in: docketwiseStatusIds } },
              { statusForFilingId: { in: docketwiseStatusIds } },
              // Handle NULL statusId - match by status name
              {
                AND: [
                  { statusId: null },
                  { status: { in: statusNames } }
                ]
              },
              // Handle NULL statusForFilingId - match by statusForFiling name
              {
                AND: [
                  { statusForFilingId: null },
                  { statusForFiling: { in: statusNames } }
                ]
              },
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

    // 3. On-Time Rate - COUNT of matters closed before deadline (in date range if provided)
    let deadlineComplianceRate = 0;
    if (dateFrom && dateTo) {
      // Filter matters with deadline in the date range
      const mattersWithDeadlineInRange = allMatters.filter(m => {
        if (!m.deadline) return false;
        const deadline = new Date(m.deadline);
        return deadline >= dateFrom && deadline <= dateTo;
      });
      
      // Count those closed before their deadline
      deadlineComplianceRate = mattersWithDeadlineInRange.filter(m => {
        if (!m.closedAt) return false;
        return new Date(m.closedAt) <= new Date(m.deadline!);
      }).length;
    } else {
      // Fallback: all closed before deadline
      const completedWithDeadlines = allMatters.filter(m => 
        m.closedAt && m.deadline
      );
      deadlineComplianceRate = completedWithDeadlines.filter(m => 
        new Date(m.closedAt!) <= new Date(m.deadline!)
      ).length;
    }

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
    // Overdue = deadline passed AND billing status is NOT paid
    const overdueMatters = allMatters.filter(m => {
      if (!m.deadline) return false;
      if (m.billingStatus === 'PAID') return false; // Exclude paid matters
      return new Date(m.deadline) < now;
    }).length;

    const atRiskMatters = allMatters.filter(m => {
      if (!m.deadline) return false;
      const daysUntil = Math.ceil((new Date(m.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 7;
    }).length;

    // Unassigned = Active matters where BOTH assignees AND docketwiseUserIds are empty/null
    // First get Active status group
    const activeGroupForUnassigned = statusGroups.find(g => g.name.toLowerCase() === 'active');
    let unassignedMatters = 0;
    
    if (activeGroupForUnassigned) {
      const activeStatusIdsForUnassigned = activeGroupForUnassigned.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.docketwiseId
      );
      const activeStatusNamesForUnassigned = activeGroupForUnassigned.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.name
      );
      
      unassignedMatters = await prisma.matters.count({
        where: {
          AND: [
            // Must be in Active status group
            {
              OR: [
                { statusId: { in: activeStatusIdsForUnassigned } },
                { statusForFilingId: { in: activeStatusIdsForUnassigned } },
                { AND: [{ statusId: null }, { status: { in: activeStatusNamesForUnassigned } }] },
                { AND: [{ statusForFilingId: null }, { statusForFiling: { in: activeStatusNamesForUnassigned } }] },
              ],
            },
            // Must be unassigned (no assignees, no docketwiseUserIds, no teamId)
            { OR: [{ assignees: null }, { assignees: "" }] },
            { OR: [{ docketwiseUserIds: null }, { docketwiseUserIds: "" }, { docketwiseUserIds: "[]" }] },
            { teamId: null },
          ],
        },
      });
    }

    // === MIDDLE ROW KPIs ===
    
    // 1. AVG Days to File - average days from creation to update for Filed status group
    const filedStatusGroup = statusGroups.find(g => g.name.toLowerCase() === 'filed');
    let avgDaysToFile = 0;
    if (filedStatusGroup) {
      const filedStatusIds = filedStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.docketwiseId
      );
      const filedStatusNames = filedStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.name
      );
      
      const filedMatters = await prisma.matters.findMany({
        where: {
          OR: [
            { statusId: { in: filedStatusIds } },
            { statusForFilingId: { in: filedStatusIds } },
            // Handle NULL statusId - match by status name
            {
              AND: [
                { statusId: null },
                { status: { in: filedStatusNames } }
              ]
            },
            // Handle NULL statusForFilingId - match by statusForFiling name
            {
              AND: [
                { statusForFilingId: null },
                { statusForFiling: { in: filedStatusNames } }
              ]
            },
          ],
          docketwiseCreatedAt: { not: null },
          docketwiseUpdatedAt: { not: null },
        },
        select: {
          docketwiseCreatedAt: true,
          docketwiseUpdatedAt: true,
        },
      });
      
      if (filedMatters.length > 0) {
        const totalDays = filedMatters.reduce((sum, matter) => {
          const createdAt = new Date(matter.docketwiseCreatedAt!);
          const updatedAt = new Date(matter.docketwiseUpdatedAt!);
          const days = Math.ceil((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(0, days); // Avoid negative days
        }, 0);
        avgDaysToFile = Math.round(totalDays / filedMatters.length);
      }
    }
    
    // 2. Case Value - sum of flatFee for Active status group matters (date range filtered)
    const activeStatusGroup = statusGroups.find(g => g.name.toLowerCase() === 'active');
    let caseValue = 0;
    if (activeStatusGroup) {
      const activeStatusIds = activeStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.docketwiseId
      );
      const activeStatusNames = activeStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.name
      );
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {
        OR: [
          { statusId: { in: activeStatusIds } },
          { statusForFilingId: { in: activeStatusIds } },
          {
            AND: [
              { statusId: null },
              { status: { in: activeStatusNames } }
            ]
          },
          {
            AND: [
              { statusForFilingId: null },
              { statusForFiling: { in: activeStatusNames } }
            ]
          },
        ],
        flatFee: { not: null },
      };
      
      if (dateFrom && dateTo) {
        whereClause.docketwiseCreatedAt = { gte: dateFrom, lte: dateTo };
      }
      
      const activeMattersWithFee = await prisma.matters.findMany({
        where: whereClause,
        select: {
          flatFee: true,
        },
      });
      
      caseValue = activeMattersWithFee.reduce((sum, matter) => sum + (matter.flatFee || 0), 0);
    }

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

    // Calculate revenue trend (using date range if available)
    let revenueTrend = 0;
    if (dateFrom && dateTo) {
      const rangeMs = dateTo.getTime() - dateFrom.getTime();
      const prevFrom = new Date(dateFrom.getTime() - rangeMs);
      const prevTo = new Date(dateFrom.getTime() - 1);
      
      const currentPeriodRevenue = allMatters
        .filter(m => {
          if (!m.closedAt) return false;
          const closedDate = new Date(m.closedAt);
          return closedDate >= dateFrom && closedDate <= dateTo;
        })
        .reduce((sum, m) => {
          if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
          const matterType = matterTypeMap.get(m.matterTypeId || 0);
          return sum + (matterType?.flatFee || 0);
        }, 0);

      const prevPeriodRevenue = allMatters
        .filter(m => {
          if (!m.closedAt) return false;
          const closedDate = new Date(m.closedAt);
          return closedDate >= prevFrom && closedDate <= prevTo;
        })
        .reduce((sum, m) => {
          if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
          const matterType = matterTypeMap.get(m.matterTypeId || 0);
          return sum + (matterType?.flatFee || 0);
        }, 0);

      if (prevPeriodRevenue > 0) {
        revenueTrend = Math.round(((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100);
      }
    }

    // Deadline miss trend - not currently used
    const deadlineMissTrend = 0;

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

      // Middle Row KPIs
      avgDaysToFile,
      caseValue,
      teamMembers: activeTeamMembers,

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

    const [activeStatusGroup, approvedStatusGroup] = await Promise.all([
      prisma.statusGroups.findFirst({
        where: {
          userId: context.user.id,
          name: { equals: 'Active', mode: 'insensitive' },
        },
        include: {
          statusGroupMappings: {
            select: {
              matterStatus: {
                select: { docketwiseId: true, name: true },
              },
            },
          },
        },
      }),
      prisma.statusGroups.findFirst({
        where: {
          userId: context.user.id,
          name: { equals: 'Approved', mode: 'insensitive' },
        },
        include: {
          statusGroupMappings: {
            select: {
              matterStatus: {
                select: { docketwiseId: true, name: true },
              },
            },
          },
        },
      }),
    ]);

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

    // Build Active status filter
    let activeStatusIds: number[] = [];
    let activeStatusNames: string[] = [];
    if (activeStatusGroup) {
      activeStatusIds = activeStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.docketwiseId
      );
      activeStatusNames = activeStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.name
      );
    }

    // Build Approved status filter for completion checks
    let approvedStatusIds: number[] = [];
    let approvedStatusNames: string[] = [];
    if (approvedStatusGroup) {
      approvedStatusIds = approvedStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.docketwiseId
      );
      approvedStatusNames = approvedStatusGroup.statusGroupMappings.map(
        (mapping) => mapping.matterStatus.name
      );
    }

    // Fetch only Active group matters from DATABASE
    const matters = await prisma.matters.findMany({
      where: activeStatusGroup ? {
        OR: [
          { statusId: { in: activeStatusIds } },
          { statusForFilingId: { in: activeStatusIds } },
          // Handle NULL statusId - match by status name
          {
            AND: [
              { statusId: null },
              { status: { in: activeStatusNames } }
            ]
          },
          // Handle NULL statusForFilingId - match by statusForFiling name
          {
            AND: [
              { statusForFilingId: null },
              { statusForFiling: { in: activeStatusNames } }
            ]
          },
        ],
      } : {},
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
        statusId: true,
        statusForFilingId: true,
        statusForFiling: true,
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
      
      for (const userId of userIds) {
        const stats = assigneeStats.get(userId);
        if (!stats) continue;

        stats.total++;
        
        // Check if completed using Approved status group or closedAt
        const isInApprovedGroup = 
          approvedStatusIds.includes(matter.statusId || 0) ||
          approvedStatusIds.includes(matter.statusForFilingId || 0) ||
          (matter.statusId === null && approvedStatusNames.includes(matter.status || '')) ||
          (matter.statusForFilingId === null && approvedStatusNames.includes(matter.statusForFiling || ''));
        
        const isCompleted = isInApprovedGroup || !!matter.closedAt;
        
        if (isCompleted) {
          stats.completed++;
        }

        // Check if overdue (has deadline, not completed, deadline passed)
        if (matter.deadline && !isCompleted) {
          const deadlineDate = new Date(matter.deadline);
          if (deadlineDate < now) {
            stats.overdue++;
          }
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
  .handler(async () => {
    const matters = await prisma.matters.findMany({
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
  .handler(async ({ input }) => {
    const matters = await prisma.matters.findMany({
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
        docketwiseUpdatedAt: matter.docketwiseUpdatedAt,
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
    months: z.number().optional().default(6),
  }))
  .output(z.array(monthlyTrendSchema))
  .handler(async ({ context }) => {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Get Approved and RFE status groups
    const [approvedStatusGroup, rfeStatusGroup] = await Promise.all([
      prisma.statusGroups.findFirst({
        where: {
          userId: context.user.id,
          name: { equals: 'Approved', mode: 'insensitive' },
        },
        include: {
          statusGroupMappings: {
            select: {
              matterStatus: {
                select: { docketwiseId: true, name: true },
              },
            },
          },
        },
      }),
      prisma.statusGroups.findFirst({
        where: {
          userId: context.user.id,
          name: { equals: 'RFE', mode: 'insensitive' },
        },
        include: {
          statusGroupMappings: {
            select: {
              matterStatus: {
                select: { docketwiseId: true, name: true },
              },
            },
          },
        },
      }),
    ]);
    
    const approvedStatusIds = approvedStatusGroup?.statusGroupMappings.map(m => m.matterStatus.docketwiseId) || [];
    const approvedStatusNames = approvedStatusGroup?.statusGroupMappings.map(m => m.matterStatus.name) || [];
    const rfeStatusIds = rfeStatusGroup?.statusGroupMappings.map(m => m.matterStatus.docketwiseId) || [];
    const rfeStatusNames = rfeStatusGroup?.statusGroupMappings.map(m => m.matterStatus.name) || [];
    
    // Get all matters with status fields
    const allMatters = await prisma.matters.findMany({
      select: {
        docketwiseCreatedAt: true,
        statusId: true,
        statusForFilingId: true,
        status: true,
        statusForFiling: true,
      },
    });

    // Calculate trends for 6 months (not affected by date range)
    const trends: Array<{ month: string; year: number; newMatters: number; approved: number; rfe: number }> = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = monthNames[monthDate.getMonth()];
      const year = monthDate.getFullYear();

      // New matters created in this month (by docketwiseCreatedAt)
      const newMatters = allMatters.filter(m => {
        const createdDate = m.docketwiseCreatedAt;
        if (!createdDate) return false;
        const date = new Date(createdDate);
        return date >= monthDate && date <= monthEnd;
      }).length;

      // Approved matters - count matters in Approved status group
      const approved = allMatters.filter(m => {
        // Match by statusId or statusForFilingId
        if (approvedStatusIds.includes(m.statusId || 0) || approvedStatusIds.includes(m.statusForFilingId || 0)) {
          return true;
        }
        // Handle NULL statusId - match by name
        if (m.statusId === null && approvedStatusNames.includes(m.status || '')) {
          return true;
        }
        if (m.statusForFilingId === null && approvedStatusNames.includes(m.statusForFiling || '')) {
          return true;
        }
        return false;
      }).length;

      // RFE matters - count matters in RFE status group CREATED in this month
      const rfe = allMatters.filter(m => {
        // First check if created in this month
        const createdDate = m.docketwiseCreatedAt;
        if (!createdDate) return false;
        const date = new Date(createdDate);
        if (date < monthDate || date > monthEnd) return false;
        
        // Then check if in RFE status group
        // Match by statusId or statusForFilingId
        if (rfeStatusIds.includes(m.statusId || 0) || rfeStatusIds.includes(m.statusForFilingId || 0)) {
          return true;
        }
        // Handle NULL statusId - match by name
        if (m.statusId === null && rfeStatusNames.includes(m.status || '')) {
          return true;
        }
        if (m.statusForFilingId === null && rfeStatusNames.includes(m.statusForFiling || '')) {
          return true;
        }
        return false;
      }).length;

      trends.push({ month: monthName, year, newMatters, approved, rfe });
    }

    return trends;
  });

