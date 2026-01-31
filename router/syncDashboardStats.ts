import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { classifyStatus, isMatterOverdue } from "@/lib/status-classifier";
import * as z from "zod";

// Sync dashboard stats endpoint - calculates and saves all stats to database
export const syncDashboardStats = authorized
  .route({
    method: "POST",
    path: "/dashboard/sync-stats",
    summary: "Calculate and cache dashboard statistics",
    tags: ["Dashboard"],
  })
  .output(z.object({ success: z.boolean(), message: z.string() }))
  .handler(async ({ context }) => {
    console.log("[DASHBOARD-SYNC] Starting dashboard stats calculation...");
    
    try {
      // === COMPREHENSIVE DATA FETCH ===
      const [allMatters, matterTypesFull, paralegals] = await Promise.all([
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
            closedAt: true,
            estimatedDeadline: true,
            actualDeadline: true,
            docketwiseCreatedAt: true,
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

      // Basic counts
      const totalContacts = await prisma.contacts.count();
      const totalMatters = await prisma.matters.count({
        where: { 
          userId: context.user.id,
          discardedAt: null,
          // DO NOT filter by archived - total means ALL matters
        },
      });
      const categories = await prisma.categories.count();
      const totalMatterTypes = await prisma.matterTypes.count();
      const matterTypesWithWorkflow = await prisma.matterTypes.count({
        where: { matterStatuses: { some: {} } },
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

      // Create maps for lookups
      const matterTypeMap = new Map(
        matterTypesFull.map(mt => [mt.docketwiseId, mt])
      );

      const now = new Date();
      
      // Filter active matters - Use status classifier (filed/approved/closed = NOT active)
      const activeMatters = allMatters.filter(matter => {
        const classification = classifyStatus(matter.status);
        // Active = NOT completed (filed/approved/denied/closed) AND not manually closed
        return !classification.isCompleted && !matter.closedAt;
      });
      
      const activeMattersCount = activeMatters.length;
      
      // New Matters This Month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newMattersThisMonth = allMatters.filter(m => {
        const createdDate = m.docketwiseCreatedAt || m.createdAt;
        if (!createdDate) return false;
        const date = new Date(createdDate);
        return date >= startOfMonth;
      }).length;
      
      // New Matters Last Month
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
      
      // Critical Matters
      const criticalMatters = allMatters.filter(m => {
        if (!m.estimatedDeadline) return false;
        const daysUntil = Math.ceil((new Date(m.estimatedDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7;
      }).length;
      
      // RFE Frequency - Use status classifier with fuzzy matching
      const rfeFrequency = allMatters.filter(m => {
        const classification = classifyStatus(m.status);
        return classification.isRFE;
      }).length;
      
      // Weighted Active Matters
      const weightedActiveMatters = activeMatters.reduce((total, matter) => {
        const complexity = matterTypeMap.get(matter.matterTypeId || 0)?.complexityWeight || 1;
        return total + complexity;
      }, 0);

      // Revenue at Risk
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
          const flatFee = matterType?.flatFee;
          if (flatFee === null || flatFee === undefined) return total;
          return total + flatFee;
        }, 0);

      // Deadline Compliance Rate
      const completedWithDeadlines = allMatters.filter(m => 
        m.closedAt && m.estimatedDeadline
      );
      const onTimeDeliveries = completedWithDeadlines.filter(m => 
        new Date(m.actualDeadline || m.closedAt!) <= new Date(m.estimatedDeadline!)
      ).length;
      const deadlineComplianceRate = completedWithDeadlines.length > 0 
        ? (onTimeDeliveries / completedWithDeadlines.length) * 100 
        : 0;

      // Average Cycle Time
      const completedMatterData = allMatters.filter(matter => 
        matter.closedAt && matter.docketwiseCreatedAt
      );
      const totalCycleTime = completedMatterData.reduce((sum, matter) => {
        const created = new Date(matter.docketwiseCreatedAt!);
        const closed = new Date(matter.closedAt!);
        return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      const avgCycleTime = completedMatterData.length > 0 
        ? totalCycleTime / completedMatterData.length 
        : 0;

      // AVG Days to File - ONLY for matters with 'filed' status
      const filedMatters = allMatters.filter(matter => {
        if (!matter.docketwiseCreatedAt) return false;
        const classification = classifyStatus(matter.status);
        return classification.isFiled;
      });
      const totalDaysToFile = filedMatters.reduce((sum, matter) => {
        const created = new Date(matter.docketwiseCreatedAt!);
        const now = new Date();
        return sum + (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      const avgDaysToFile = filedMatters.length > 0 
        ? Math.round(totalDaysToFile / filedMatters.length) 
        : 0;

      // Paralegal Utilization
      const paralegalUtilization = paralegals.length > 0
        ? paralegals.reduce((sum, p) => sum + (p.utilizationTarget || 0), 0) / paralegals.length
        : 0;

      // Risk metrics - Use status classifier to exclude closed/approved/denied
      const overdueMatters = allMatters.filter(m => {
        return isMatterOverdue(m.estimatedDeadline, m.status);
      }).length;

      const atRiskMatters = allMatters.filter(m => {
        if (!m.estimatedDeadline || m.closedAt) return false;
        const daysUntil = Math.ceil((new Date(m.estimatedDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil > 0 && daysUntil <= 7;
      }).length;

      // Unassigned - matters with NO assignee (empty or null)
      const unassignedMatters = activeMatters.filter(m => {
        const noAssignees = !m.assignees || m.assignees.trim() === '';
        const noTeam = !m.teamId; // teamId is Int, just check if exists
        return noAssignees && noTeam;
      }).length;

      const overloadedParalegals = paralegals.filter(p => 
        (p.utilizationTarget || 0) > 90
      ).length;

      // Financial metrics
      const totalRevenue = allMatters.reduce((sum, m) => {
        if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        return sum + (matterType?.flatFee || 0);
      }, 0);

      const pendingRevenue = activeMatters.reduce((sum, m) => {
        if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
        const matterType = matterTypeMap.get(m.matterTypeId || 0);
        return sum + (matterType?.flatFee || 0);
      }, 0);

      const collectedRevenue = allMatters
        .filter(m => m.closedAt)
        .reduce((sum, m) => {
          if (m.flatFee !== null && m.flatFee !== undefined) return sum + m.flatFee;
          const matterType = matterTypeMap.get(m.matterTypeId || 0);
          return sum + (matterType?.flatFee || 0);
        }, 0);

      const averageMatterValue = allMatters.length > 0 ? totalRevenue / allMatters.length : 0;

      // Performance metrics
      const matterVelocity = avgCycleTime;
      const onTimeRate = deadlineComplianceRate;
      const teamUtilization = paralegalUtilization;

      // Quality metrics
      const totalRfeCount = allMatters.reduce((sum, m) => sum + (m.rfeCount || 0), 0);
      const avgRfeRate = allMatters.length > 0 ? totalRfeCount / allMatters.length : 0;
      const totalReworkCount = allMatters.reduce((sum, m) => sum + (m.revisionCount || 0), 0);
      const totalErrorCount = allMatters.reduce((sum, m) => sum + (m.errorCount || 0), 0);
      const qualityScore = allMatters.length > 0 
        ? Math.max(0, 100 - ((totalRfeCount + totalReworkCount + totalErrorCount) / allMatters.length) * 10)
        : 100;

      // Capacity metrics
      const totalAvailableHours = paralegals.reduce((sum, p) => sum + (p.availableHoursPerWeek || 0), 0);
      const totalAssignedHours = activeMatters.reduce((sum, m) => sum + (m.totalHours || 0), 0);
      const totalBillableHours = allMatters
        .filter(m => m.closedAt)
        .reduce((sum, m) => sum + (m.totalHours || 0), 0);

      // Trends
      const mattersTrend = newMattersLastMonth > 0 
        ? Math.round(((newMattersThisMonth - newMattersLastMonth) / newMattersLastMonth) * 100)
        : newMattersThisMonth > 0 ? 100 : 0;

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

      const thisMonthOverdue = allMatters.filter(m => {
        if (!m.estimatedDeadline) return false;
        const deadline = new Date(m.estimatedDeadline);
        // Use status classifier to exclude closed/approved/denied
        return deadline < now && deadline >= startOfMonth && isMatterOverdue(m.estimatedDeadline, m.status);
      }).length;

      const lastMonthOverdue = allMatters.filter(m => {
        if (!m.estimatedDeadline) return false;
        const deadline = new Date(m.estimatedDeadline);
        // Use status classifier to exclude closed/approved/denied
        return deadline >= startOfLastMonth && deadline <= endOfLastMonth && isMatterOverdue(m.estimatedDeadline, m.status);
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

      const mattersWithoutDeadline = allMatters.filter(m => !m.estimatedDeadline).length;
      const mattersWithoutMatterType = allMatters.filter(m => !m.matterTypeId).length;

      const dataQualityIssues = mattersWithoutPricing + mattersWithoutDeadline + mattersWithoutMatterType;
      const dataQualityScore = allMatters.length > 0
        ? Math.max(0, 100 - (dataQualityIssues / allMatters.length) * 100)
        : 100;

      // Upsert dashboard stats
      await prisma.dashboardStats.upsert({
        where: { userId: context.user.id },
        create: {
          userId: context.user.id,
          totalMatters,
          activeMattersCount,
          newMattersThisMonth,
          criticalMatters,
          rfeFrequency,
          overdueMatters,
          avgDaysToFile,
          estRevenue: totalRevenue,
          unassigned: unassignedMatters,
          newMattersGrowth,
          weightedActiveMatters,
          revenueAtRisk,
          deadlineComplianceRate,
          avgCycleTime,
          paralegalUtilization,
          atRiskMatters,
          unassignedMatters,
          overloadedParalegals,
          totalRevenue,
          pendingRevenue,
          collectedRevenue,
          averageMatterValue,
          matterVelocity,
          onTimeRate,
          teamUtilization,
          avgRfeRate,
          totalReworkCount,
          qualityScore,
          totalAvailableHours,
          totalAssignedHours,
          totalBillableHours,
          mattersTrend,
          revenueTrend,
          deadlineMissTrend,
          mattersWithoutPricing,
          mattersWithoutDeadline,
          mattersWithoutMatterType,
          dataQualityScore,
          totalContacts,
          totalMatterTypes,
          teamMembers,
          categories,
          activeTeamMembers,
          matterTypesWithWorkflow,
          editedMatters,
          lastSyncedAt: now,
          calculatedAt: now,
        },
        update: {
          totalMatters,
          activeMattersCount,
          newMattersThisMonth,
          criticalMatters,
          rfeFrequency,
          overdueMatters,
          avgDaysToFile,
          estRevenue: totalRevenue,
          unassigned: unassignedMatters,
          newMattersGrowth,
          weightedActiveMatters,
          revenueAtRisk,
          deadlineComplianceRate,
          avgCycleTime,
          paralegalUtilization,
          atRiskMatters,
          unassignedMatters,
          overloadedParalegals,
          totalRevenue,
          pendingRevenue,
          collectedRevenue,
          averageMatterValue,
          matterVelocity,
          onTimeRate,
          teamUtilization,
          avgRfeRate,
          totalReworkCount,
          qualityScore,
          totalAvailableHours,
          totalAssignedHours,
          totalBillableHours,
          mattersTrend,
          revenueTrend,
          deadlineMissTrend,
          mattersWithoutPricing,
          mattersWithoutDeadline,
          mattersWithoutMatterType,
          dataQualityScore,
          totalContacts,
          totalMatterTypes,
          teamMembers,
          categories,
          activeTeamMembers,
          matterTypesWithWorkflow,
          editedMatters,
          lastSyncedAt: now,
          calculatedAt: now,
        },
      });

      console.log("[DASHBOARD-SYNC] Dashboard stats calculated and saved successfully");
      
      return {
        success: true,
        message: "Dashboard stats synced successfully",
      };
    } catch (error) {
      console.error("[DASHBOARD-SYNC] Error syncing dashboard stats:", error);
      throw error;
    }
  });
