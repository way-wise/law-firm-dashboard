"use client";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { ReportDataType } from "@/schema/reportSchema";

export function exportReportToExcel(report: ReportDataType, firmName: string = "Law Firm") {
  const workbook = XLSX.utils.book_new();

  // ========== SUMMARY SHEET ==========
  const summaryData = [
    ["Report Summary"],
    [""],
    ["Firm", firmName],
    ["Date Range", `${format(report.dateRange.start, "MMM d, yyyy")} - ${format(report.dateRange.end, "MMM d, yyyy")}`],
    ["Generated", format(report.generatedAt, "MMM d, yyyy 'at' h:mm a")],
    [""],
    ["Key Metrics"],
    ["Total Matters in Period", report.summary.totalMatters],
    ["New Matters", report.summary.newMatters],
    ["Completed Matters", report.summary.completedMatters],
    ["Currently Active", report.summary.activeMatters],
    ["Avg. Completion Time (days)", report.summary.averageCompletionDays || "N/A"],
    [""],
    ["Deadline Performance"],
    ["Upcoming Deadlines (30 days)", report.deadlineTracking.upcomingDeadlines],
    ["Overdue Deadlines", report.deadlineTracking.overdueDeadlines],
    ["Met Deadlines", report.deadlineTracking.metDeadlines],
    ["Missed Deadlines", report.deadlineTracking.missedDeadlines],
    ["On-Time Rate", `${report.deadlineTracking.onTimePercentage}%`],
    [""],
    ["Billing Summary"],
    ["Paid", report.billingSummary.paid],
    ["Deposit Paid", report.billingSummary.depositPaid],
    ["Payment Plan", report.billingSummary.paymentPlan],
    ["Due", report.billingSummary.due],
    ["Unbilled", report.billingSummary.unbilled],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // ========== STATUS BREAKDOWN SHEET ==========
  if (report.statusBreakdown.length > 0) {
    const statusData = [
      ["Status", "Count", "Percentage"],
      ...report.statusBreakdown.map((s) => [s.status, s.count, `${s.percentage}%`]),
    ];
    const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
    statusSheet["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, statusSheet, "Status Breakdown");
  }

  // ========== TYPE BREAKDOWN SHEET ==========
  if (report.typeBreakdown.length > 0) {
    const typeData = [
      ["Type", "Count", "Percentage"],
      ...report.typeBreakdown.map((t) => [t.type, t.count, `${t.percentage}%`]),
    ];
    const typeSheet = XLSX.utils.aoa_to_sheet(typeData);
    typeSheet["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, typeSheet, "Type Breakdown");
  }

  // ========== TEAM PERFORMANCE SHEET ==========
  if (report.assigneePerformance.length > 0) {
    const teamData = [
      ["Assignee", "Email", "Total Matters", "Completed", "Active", "Overdue", "Total Hours", "Avg Days", "Score"],
      ...report.assigneePerformance.map((a) => [
        a.name,
        a.email,
        a.totalMatters,
        a.completedMatters,
        a.activeMaters,
        a.overdueMatters,
        a.totalHours,
        a.averageCompletionDays || "N/A",
        `${a.performanceScore}%`,
      ]),
    ];
    const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
    teamSheet["!cols"] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, teamSheet, "Team Performance");
  }

  // ========== TIME PERIOD SHEET ==========
  if (report.timePeriodData.length > 0) {
    const periodData = [
      ["Period", "Start Date", "End Date", "New Matters", "Completed", "Hours Logged"],
      ...report.timePeriodData.map((p) => [
        p.period,
        format(new Date(p.startDate), "MMM d, yyyy"),
        format(new Date(p.endDate), "MMM d, yyyy"),
        p.newMatters,
        p.completedMatters,
        p.totalHours,
      ]),
    ];
    const periodSheet = XLSX.utils.aoa_to_sheet(periodData);
    periodSheet["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, periodSheet, `${report.groupBy === "week" ? "Weekly" : "Monthly"} Data`);
  }

  // ========== ISSUES SHEET ==========
  if (report.issues.length > 0) {
    const issuesData = [
      ["Severity", "Type", "Matter ID", "Matter Title", "Description", "Days Overdue"],
      ...report.issues.map((i) => [
        i.severity.toUpperCase(),
        i.type.replace("_", " ").toUpperCase(),
        i.matterId,
        i.matterTitle,
        i.description,
        i.daysOverdue || "",
      ]),
    ];
    const issuesSheet = XLSX.utils.aoa_to_sheet(issuesData);
    issuesSheet["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 40 },
      { wch: 40 },
      { wch: 30 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, issuesSheet, "Issues & Alerts");
  }

  // Save the workbook
  const fileName = `Report_${format(report.dateRange.start, "yyyyMMdd")}_${format(report.dateRange.end, "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
