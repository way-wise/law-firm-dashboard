import * as z from "zod";

// Report filter input schema
export const reportFilterSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  groupBy: z.enum(["day", "week", "month"]).default("week"),
});

// Matter summary stats
export const matterSummarySchema = z.object({
  totalMatters: z.number(),
  newMatters: z.number(),
  completedMatters: z.number(),
  activeMatters: z.number(),
  averageCompletionDays: z.number().nullable(),
});

// Status breakdown
export const statusBreakdownSchema = z.object({
  status: z.string(),
  count: z.number(),
  percentage: z.number(),
});

// Type breakdown
export const typeBreakdownSchema = z.object({
  type: z.string(),
  count: z.number(),
  percentage: z.number(),
});

// Assignee performance
export const assigneePerformanceSchema = z.object({
  name: z.string(),
  email: z.string(),
  totalMatters: z.number(),
  completedMatters: z.number(),
  activeMaters: z.number(),
  totalHours: z.number(),
  averageCompletionDays: z.number().nullable(),
  overdueMatters: z.number(),
  performanceScore: z.number(), // 0-100
});

// Deadline tracking
export const deadlineTrackingSchema = z.object({
  upcomingDeadlines: z.number(),
  overdueDeadlines: z.number(),
  metDeadlines: z.number(),
  missedDeadlines: z.number(),
  onTimePercentage: z.number(),
});

// Billing summary
export const billingSummarySchema = z.object({
  paid: z.number(),
  depositPaid: z.number(),
  paymentPlan: z.number(),
  due: z.number(),
  unbilled: z.number(),
});

// Time period data for charts
export const timePeriodDataSchema = z.object({
  period: z.string(), // e.g., "Week 1", "January 2024"
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  newMatters: z.number(),
  completedMatters: z.number(),
  totalHours: z.number(),
});

// Issues/bottlenecks
export const issueSchema = z.object({
  type: z.enum(["overdue", "stale", "unassigned", "long_pending"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  matterId: z.string(),
  matterTitle: z.string(),
  description: z.string(),
  daysOverdue: z.number().nullable(),
});

// Complete report schema
export const reportDataSchema = z.object({
  generatedAt: z.coerce.date(),
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }),
  groupBy: z.enum(["day", "week", "month"]),
  summary: matterSummarySchema,
  statusBreakdown: z.array(statusBreakdownSchema),
  typeBreakdown: z.array(typeBreakdownSchema),
  assigneePerformance: z.array(assigneePerformanceSchema),
  deadlineTracking: deadlineTrackingSchema,
  billingSummary: billingSummarySchema,
  timePeriodData: z.array(timePeriodDataSchema),
  issues: z.array(issueSchema),
});

// Export types
export type ReportFilterType = z.infer<typeof reportFilterSchema>;
export type MatterSummaryType = z.infer<typeof matterSummarySchema>;
export type StatusBreakdownType = z.infer<typeof statusBreakdownSchema>;
export type TypeBreakdownType = z.infer<typeof typeBreakdownSchema>;
export type AssigneePerformanceType = z.infer<typeof assigneePerformanceSchema>;
export type DeadlineTrackingType = z.infer<typeof deadlineTrackingSchema>;
export type BillingSummaryType = z.infer<typeof billingSummarySchema>;
export type TimePeriodDataType = z.infer<typeof timePeriodDataSchema>;
export type IssueType = z.infer<typeof issueSchema>;
export type ReportDataType = z.infer<typeof reportDataSchema>;
