import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import {
  reportFilterSchema,
  reportDataSchema,
  type StatusBreakdownType,
  type TypeBreakdownType,
  type AssigneePerformanceType,
  type TimePeriodDataType,
  type IssueType,
} from "@/schema/reportSchema";
import {
  endOfWeek,
  endOfMonth,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  differenceInDays,
  isAfter,
  isBefore,
} from "date-fns";

// Generate Report Data
export const generateReport = authorized
  .route({
    method: "POST",
    path: "/reports/generate",
    summary: "Generate comprehensive report for date range",
    tags: ["Reports"],
  })
  .input(reportFilterSchema)
  .output(reportDataSchema)
  .handler(async ({ input, context }) => {
    const { startDate, endDate, groupBy } = input;
    const userId = context.user.id;

    // Fetch all matters in date range
    const matters = await prisma.matters.findMany({
      where: {
        userId,
        OR: [
          { createdAt: { gte: startDate, lte: endDate } },
          { updatedAt: { gte: startDate, lte: endDate } },
          { openedAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        editedByUser: {
          select: { name: true, email: true },
        },
      },
    });

    // Also get all matters for baseline stats
    const allMatters = await prisma.matters.findMany({
      where: { userId },
    });

    // Get team members for assignee mapping
    const teamMembers = await prisma.teams.findMany({
      where: { isActive: true },
    });

    const now = new Date();

    // ========== SUMMARY ==========
    const newMatters = matters.filter(
      (m) => m.createdAt >= startDate && m.createdAt <= endDate
    ).length;

    const completedMatters = matters.filter(
      (m) =>
        m.closedAt &&
        m.closedAt >= startDate &&
        m.closedAt <= endDate
    ).length;

    const activeMatters = allMatters.filter((m) => !m.closedAt).length;

    // Calculate average completion days
    const completedWithDates = matters.filter(
      (m) => m.closedAt && m.openedAt
    );
    const avgCompletionDays =
      completedWithDates.length > 0
        ? Math.round(
            completedWithDates.reduce(
              (sum, m) =>
                sum + differenceInDays(m.closedAt!, m.openedAt!),
              0
            ) / completedWithDates.length
          )
        : null;

    // ========== STATUS BREAKDOWN ==========
    const statusCounts = new Map<string, number>();
    matters.forEach((m) => {
      const status = m.status || "Unknown";
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const totalForStatus = matters.length || 1;
    const statusBreakdown: StatusBreakdownType[] = Array.from(
      statusCounts.entries()
    )
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / totalForStatus) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // ========== TYPE BREAKDOWN ==========
    const typeCounts = new Map<string, number>();
    matters.forEach((m) => {
      const type = m.matterType || "Unknown";
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const totalForType = matters.length || 1;
    const typeBreakdown: TypeBreakdownType[] = Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalForType) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // ========== ASSIGNEE PERFORMANCE ==========
    const assigneeMap = new Map<
      string,
      {
        name: string;
        email: string;
        matters: typeof matters;
      }
    >();

    // Build assignee performance data
    matters.forEach((m) => {
      if (m.assignees) {
        const assignees = m.assignees.split(",").map((a) => a.trim());
        assignees.forEach((assignee) => {
          if (!assigneeMap.has(assignee)) {
            const teamMember = teamMembers.find(
              (tm) =>
                tm.fullName === assignee ||
                `${tm.firstName} ${tm.lastName}`.trim() === assignee
            );
            assigneeMap.set(assignee, {
              name: assignee,
              email: teamMember?.email || "",
              matters: [],
            });
          }
          assigneeMap.get(assignee)!.matters.push(m);
        });
      }
    });

    const assigneePerformance: AssigneePerformanceType[] = Array.from(
      assigneeMap.entries()
    ).map(([name, data]) => {
      const completed = data.matters.filter((m) => m.closedAt).length;
      const active = data.matters.filter((m) => !m.closedAt).length;
      const overdue = data.matters.filter(
        (m) =>
          m.estimatedDeadline &&
          !m.closedAt &&
          isBefore(m.estimatedDeadline, now)
      ).length;

      const completedWithDates = data.matters.filter(
        (m) => m.closedAt && m.openedAt
      );
      const avgDays =
        completedWithDates.length > 0
          ? Math.round(
              completedWithDates.reduce(
                (sum, m) =>
                  sum + differenceInDays(m.closedAt!, m.openedAt!),
                0
              ) / completedWithDates.length
            )
          : null;

      const totalHours = data.matters.reduce(
        (sum, m) => sum + (m.totalHours || 0),
        0
      );

      // Performance score: based on completion rate, overdue rate, and hours logged
      const completionRate =
        data.matters.length > 0 ? completed / data.matters.length : 0;
      const overdueRate =
        active > 0 ? 1 - overdue / active : 1;
      const performanceScore = Math.round(
        (completionRate * 50 + overdueRate * 50)
      );

      return {
        name,
        email: data.email,
        totalMatters: data.matters.length,
        completedMatters: completed,
        activeMaters: active,
        totalHours,
        averageCompletionDays: avgDays,
        overdueMatters: overdue,
        performanceScore,
      };
    });

    // Sort by performance score (lowest first to highlight who needs attention)
    assigneePerformance.sort((a, b) => a.performanceScore - b.performanceScore);

    // ========== DEADLINE TRACKING ==========
    const upcomingDeadlines = allMatters.filter(
      (m) =>
        m.estimatedDeadline &&
        !m.closedAt &&
        isAfter(m.estimatedDeadline, now) &&
        differenceInDays(m.estimatedDeadline, now) <= 30
    ).length;

    const overdueDeadlines = allMatters.filter(
      (m) =>
        m.estimatedDeadline && !m.closedAt && isBefore(m.estimatedDeadline, now)
    ).length;

    const mattersWithDeadlines = allMatters.filter(
      (m) => m.estimatedDeadline && m.closedAt
    );
    const metDeadlines = mattersWithDeadlines.filter(
      (m) => !isAfter(m.closedAt!, m.estimatedDeadline!)
    ).length;
    const missedDeadlines = mattersWithDeadlines.filter((m) =>
      isAfter(m.closedAt!, m.estimatedDeadline!)
    ).length;

    const totalDeadlineMatters = metDeadlines + missedDeadlines;
    const onTimePercentage =
      totalDeadlineMatters > 0
        ? Math.round((metDeadlines / totalDeadlineMatters) * 100)
        : 100;

    // ========== BILLING SUMMARY ==========
    const billingSummary = {
      paid: matters.filter((m) => m.billingStatus === "PAID").length,
      depositPaid: matters.filter((m) => m.billingStatus === "DEPOSIT_PAID")
        .length,
      paymentPlan: matters.filter((m) => m.billingStatus === "PAYMENT_PLAN")
        .length,
      due: matters.filter((m) => m.billingStatus === "DUE").length,
      unbilled: matters.filter((m) => !m.billingStatus).length,
    };

    // ========== TIME PERIOD DATA ==========
    const timePeriodData: TimePeriodDataType[] = [];

    if (groupBy === "week") {
      const weeks = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 }
      );
      weeks.forEach((weekStart, idx) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const periodMatters = matters.filter(
          (m) => m.createdAt >= weekStart && m.createdAt <= weekEnd
        );
        const periodCompleted = matters.filter(
          (m) => m.closedAt && m.closedAt >= weekStart && m.closedAt <= weekEnd
        );
        const periodHours = periodMatters.reduce(
          (sum, m) => sum + (m.totalHours || 0),
          0
        );

        timePeriodData.push({
          period: `Week ${idx + 1}`,
          startDate: weekStart,
          endDate: weekEnd > endDate ? endDate : weekEnd,
          newMatters: periodMatters.length,
          completedMatters: periodCompleted.length,
          totalHours: periodHours,
        });
      });
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      months.forEach((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const periodMatters = matters.filter(
          (m) => m.createdAt >= monthStart && m.createdAt <= monthEnd
        );
        const periodCompleted = matters.filter(
          (m) =>
            m.closedAt && m.closedAt >= monthStart && m.closedAt <= monthEnd
        );
        const periodHours = periodMatters.reduce(
          (sum, m) => sum + (m.totalHours || 0),
          0
        );

        timePeriodData.push({
          period: format(monthStart, "MMMM yyyy"),
          startDate: monthStart,
          endDate: monthEnd > endDate ? endDate : monthEnd,
          newMatters: periodMatters.length,
          completedMatters: periodCompleted.length,
          totalHours: periodHours,
        });
      });
    }

    // ========== ISSUES ==========
    const issues: IssueType[] = [];

    // Overdue matters
    allMatters
      .filter(
        (m) =>
          m.estimatedDeadline &&
          !m.closedAt &&
          isBefore(m.estimatedDeadline, now)
      )
      .forEach((m) => {
        const daysOverdue = differenceInDays(now, m.estimatedDeadline!);
        issues.push({
          type: "overdue",
          severity:
            daysOverdue > 30
              ? "critical"
              : daysOverdue > 14
                ? "high"
                : daysOverdue > 7
                  ? "medium"
                  : "low",
          matterId: m.id,
          matterTitle: m.title,
          description: `Deadline was ${daysOverdue} days ago`,
          daysOverdue,
        });
      });

    // Stale matters (no update in 30+ days)
    allMatters
      .filter((m) => !m.closedAt && differenceInDays(now, m.updatedAt) > 30)
      .forEach((m) => {
        const daysSinceUpdate = differenceInDays(now, m.updatedAt);
        issues.push({
          type: "stale",
          severity:
            daysSinceUpdate > 90
              ? "critical"
              : daysSinceUpdate > 60
                ? "high"
                : "medium",
          matterId: m.id,
          matterTitle: m.title,
          description: `No updates for ${daysSinceUpdate} days`,
          daysOverdue: null,
        });
      });

    // Unassigned matters
    allMatters
      .filter((m) => !m.closedAt && !m.assignees)
      .forEach((m) => {
        issues.push({
          type: "unassigned",
          severity: "medium",
          matterId: m.id,
          matterTitle: m.title,
          description: "No assignee assigned to this matter",
          daysOverdue: null,
        });
      });

    // Long pending matters (open for 90+ days)
    allMatters
      .filter((m) => !m.closedAt && m.openedAt && differenceInDays(now, m.openedAt) > 90)
      .forEach((m) => {
        const daysOpen = differenceInDays(now, m.openedAt!);
        issues.push({
          type: "long_pending",
          severity: daysOpen > 180 ? "high" : "medium",
          matterId: m.id,
          matterTitle: m.title,
          description: `Open for ${daysOpen} days`,
          daysOverdue: null,
        });
      });

    // Sort issues by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return {
      generatedAt: now,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      groupBy,
      summary: {
        totalMatters: matters.length,
        newMatters,
        completedMatters,
        activeMatters,
        averageCompletionDays: avgCompletionDays,
      },
      statusBreakdown,
      typeBreakdown,
      assigneePerformance,
      deadlineTracking: {
        upcomingDeadlines,
        overdueDeadlines,
        metDeadlines,
        missedDeadlines,
        onTimePercentage,
      },
      billingSummary,
      timePeriodData,
      issues,
    };
  });
