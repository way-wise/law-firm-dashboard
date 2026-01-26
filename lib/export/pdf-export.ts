"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { ReportDataType } from "@/schema/reportSchema";

export function exportReportToPDF(report: ReportDataType, firmName: string = "Law Firm") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function to add new page if needed
  const checkPageBreak = (neededSpace: number = 40) => {
    if (yPos + neededSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // ========== HEADER ==========
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(firmName, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("Comprehensive Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${format(report.dateRange.start, "MMM d, yyyy")} - ${format(report.dateRange.end, "MMM d, yyyy")}`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += 5;
  doc.text(
    `Generated on ${format(report.generatedAt, "MMM d, yyyy 'at' h:mm a")}`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  doc.setTextColor(0);
  yPos += 15;

  // ========== EXECUTIVE SUMMARY ==========
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const summaryData = [
    ["Total Matters in Period", report.summary.totalMatters.toString()],
    ["New Matters", report.summary.newMatters.toString()],
    ["Completed Matters", report.summary.completedMatters.toString()],
    ["Currently Active", report.summary.activeMatters.toString()],
    [
      "Avg. Completion Time",
      report.summary.averageCompletionDays
        ? `${report.summary.averageCompletionDays} days`
        : "N/A",
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // ========== DEADLINE TRACKING ==========
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Deadline Performance", 14, yPos);
  yPos += 8;

  const deadlineData = [
    ["Upcoming Deadlines (30 days)", report.deadlineTracking.upcomingDeadlines.toString()],
    ["Overdue Deadlines", report.deadlineTracking.overdueDeadlines.toString()],
    ["Met Deadlines", report.deadlineTracking.metDeadlines.toString()],
    ["Missed Deadlines", report.deadlineTracking.missedDeadlines.toString()],
    ["On-Time Rate", `${report.deadlineTracking.onTimePercentage}%`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: deadlineData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // ========== STATUS BREAKDOWN ==========
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Status Breakdown", 14, yPos);
  yPos += 8;

  if (report.statusBreakdown.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Status", "Count", "Percentage"]],
      body: report.statusBreakdown.map((s) => [s.status, s.count.toString(), `${s.percentage}%`]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10 },
    });
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // ========== TYPE BREAKDOWN ==========
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Matter Type Breakdown", 14, yPos);
  yPos += 8;

  if (report.typeBreakdown.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Type", "Count", "Percentage"]],
      body: report.typeBreakdown.map((t) => [t.type, t.count.toString(), `${t.percentage}%`]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10 },
    });
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // ========== BILLING SUMMARY ==========
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Billing Summary", 14, yPos);
  yPos += 8;

  const billingData = [
    ["Paid", report.billingSummary.paid.toString()],
    ["Deposit Paid", report.billingSummary.depositPaid.toString()],
    ["Payment Plan", report.billingSummary.paymentPlan.toString()],
    ["Due", report.billingSummary.due.toString()],
    ["Unbilled", report.billingSummary.unbilled.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Status", "Count"]],
    body: billingData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // ========== TEAM PERFORMANCE ==========
  checkPageBreak(80);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Team Performance", 14, yPos);
  yPos += 8;

  if (report.assigneePerformance.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Assignee", "Total", "Completed", "Active", "Overdue", "Hours", "Score"]],
      body: report.assigneePerformance.map((a) => [
        a.name,
        a.totalMatters.toString(),
        a.completedMatters.toString(),
        a.activeMaters.toString(),
        a.overdueMatters.toString(),
        a.totalHours.toFixed(1),
        `${a.performanceScore}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        6: {
          fontStyle: "bold",
          halign: "center",
        },
      },
    });
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // ========== TIME PERIOD ANALYSIS ==========
  checkPageBreak(80);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${report.groupBy === "week" ? "Weekly" : "Monthly"} Breakdown`, 14, yPos);
  yPos += 8;

  if (report.timePeriodData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Period", "New Matters", "Completed", "Hours Logged"]],
      body: report.timePeriodData.map((p) => [
        p.period,
        p.newMatters.toString(),
        p.completedMatters.toString(),
        p.totalHours.toFixed(1),
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10 },
    });
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // ========== ISSUES & ALERTS ==========
  if (report.issues.length > 0) {
    checkPageBreak(80);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Issues & Alerts", 14, yPos);
    yPos += 8;

    const severityColors: Record<string, [number, number, number]> = {
      critical: [220, 38, 38],
      high: [249, 115, 22],
      medium: [234, 179, 8],
      low: [34, 197, 94],
    };

    autoTable(doc, {
      startY: yPos,
      head: [["Severity", "Type", "Matter", "Description"]],
      body: report.issues.slice(0, 20).map((issue) => [
        issue.severity.toUpperCase(),
        issue.type.replace("_", " ").toUpperCase(),
        issue.matterTitle.substring(0, 30) + (issue.matterTitle.length > 30 ? "..." : ""),
        issue.description,
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const severity = data.cell.raw?.toString().toLowerCase() || "";
          if (severityColors[severity]) {
            data.cell.styles.textColor = severityColors[severity];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(
      `Confidential - ${firmName}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `Report_${format(report.dateRange.start, "yyyyMMdd")}_${format(report.dateRange.end, "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}
