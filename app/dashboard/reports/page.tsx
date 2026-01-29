"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { FileText, Download, FileSpreadsheet, Loader2, AlertTriangle, TrendingUp, Users, Clock, DollarSign, Calendar } from "lucide-react";
import { client } from "@/lib/orpc/client";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportReportToPDF } from "@/lib/export/pdf-export";
import { exportReportToExcel } from "@/lib/export/excel-export";
import type { ReportDataType } from "@/schema/reportSchema";

type PresetType = "today" | "yesterday" | "last7days" | "last30days" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "custom";

const presets: { value: PresetType; label: string; groupBy: "day" | "week" | "month" }[] = [
  { value: "today", label: "Today", groupBy: "day" },
  { value: "yesterday", label: "Yesterday", groupBy: "day" },
  { value: "last7days", label: "Last 7 Days", groupBy: "day" },
  { value: "last30days", label: "Last 30 Days", groupBy: "day" },
  { value: "thisWeek", label: "This Week", groupBy: "day" },
  { value: "lastWeek", label: "Last Week", groupBy: "day" },
  { value: "thisMonth", label: "This Month", groupBy: "week" },
  { value: "lastMonth", label: "Last Month", groupBy: "week" },
  { value: "thisQuarter", label: "This Quarter", groupBy: "month" },
  { value: "lastQuarter", label: "Last Quarter", groupBy: "month" },
  { value: "thisYear", label: "This Year", groupBy: "month" },
  { value: "lastYear", label: "Last Year", groupBy: "month" },
  { value: "custom", label: "Custom Range", groupBy: "week" },
];

function getPresetDateRange(preset: PresetType): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case "last7days":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last30days":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "thisWeek":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "lastWeek":
      const lastWeek = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "lastMonth":
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "thisQuarter":
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
      return { from: quarterStart, to: quarterEnd };
    case "lastQuarter":
      const prevQuarter = Math.floor(now.getMonth() / 3) - 1;
      const year = prevQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const q = prevQuarter < 0 ? 3 : prevQuarter;
      const pqStart = new Date(year, q * 3, 1);
      const pqEnd = new Date(year, q * 3 + 3, 0);
      return { from: pqStart, to: pqEnd };
    case "thisYear":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "lastYear":
      const lastYear = subYears(now, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    default:
      return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(now) };
  }
}

export default function ReportsPage() {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("last30days");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const range = getPresetDateRange("last30days");
    return { from: range.from, to: range.to };
  });
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReportDataType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (preset: PresetType) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      const range = getPresetDateRange(preset);
      setDateRange({ from: range.from, to: range.to });
      const presetConfig = presets.find(p => p.value === preset);
      if (presetConfig) {
        setGroupBy(presetConfig.groupBy);
      }
    }
  };

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setError("Please select a date range");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await client.reports.generate({
        startDate: dateRange.from,
        endDate: dateRange.to,
        groupBy,
      });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (report) {
      exportReportToPDF(report, "Law Firm Dashboard");
    }
  };

  const handleExportExcel = () => {
    if (report) {
      exportReportToExcel(report, "Law Firm Dashboard");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports for your law firm
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Settings
          </CardTitle>
          <CardDescription>
            Select a time period and generate comprehensive reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="mb-2 block text-sm font-medium">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              {presets.slice(0, 8).map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedPreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* More Options */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium">Time Period</label>
              <Select value={selectedPreset} onValueChange={(v) => handlePresetChange(v as PresetType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPreset === "custom" && (
              <div>
                <label className="mb-2 block text-sm font-medium">Custom Date Range</label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
              </div>
            )}
            
            <div>
              <label className="mb-2 block text-sm font-medium">Group By</label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "day" | "week" | "month")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={generateReport} disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText />
                  Generate Report
                </>
              )}
            </Button>
          </div>
          
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      {report && (
        <>
          {/* Export Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet />
              Export Excel
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Matters</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalMatters}</div>
                <p className="text-xs text-muted-foreground">
                  {report.summary.newMatters} new in period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.completedMatters}</div>
                <p className="text-xs text-muted-foreground">
                  {report.summary.averageCompletionDays
                    ? `Avg. ${report.summary.averageCompletionDays} days`
                    : "No completion data"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.deadlineTracking.onTimePercentage}%</div>
                <Progress value={report.deadlineTracking.onTimePercentage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.issues.length}</div>
                <p className="text-xs text-muted-foreground">
                  {report.issues.filter((i) => i.severity === "critical" || i.severity === "high").length} high priority
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.statusBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {report.statusBreakdown.map((status) => (
                          <div key={status.status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{status.status}</span>
                              <Badge variant="secondary">{status.count}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={status.percentage} className="w-20" />
                              <span className="text-sm text-muted-foreground w-10 text-right">
                                {status.percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No status data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Type Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Type Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.typeBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {report.typeBreakdown.map((type) => (
                          <div key={type.type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{type.type}</span>
                              <Badge variant="secondary">{type.count}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={type.percentage} className="w-20" />
                              <span className="text-sm text-muted-foreground w-10 text-right">
                                {type.percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No type data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Deadline Tracking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deadline Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {report.deadlineTracking.upcomingDeadlines}
                        </p>
                        <p className="text-xs text-muted-foreground">Upcoming (30d)</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
                          {report.deadlineTracking.overdueDeadlines}
                        </p>
                        <p className="text-xs text-muted-foreground">Overdue</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {report.deadlineTracking.metDeadlines}
                        </p>
                        <p className="text-xs text-muted-foreground">Met</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">
                          {report.deadlineTracking.missedDeadlines}
                        </p>
                        <p className="text-xs text-muted-foreground">Missed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Billing Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Paid</span>
                        <Badge variant="default" className="bg-green-600">{report.billingSummary.paid}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Deposit Paid</span>
                        <Badge variant="secondary">{report.billingSummary.depositPaid}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Payment Plan</span>
                        <Badge variant="secondary">{report.billingSummary.paymentPlan}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Due</span>
                        <Badge variant="destructive">{report.billingSummary.due}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Unbilled</span>
                        <Badge variant="outline">{report.billingSummary.unbilled}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Team Performance Tab */}
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Performance
                  </CardTitle>
                  <CardDescription>
                    Performance metrics for each team member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.assigneePerformance.length > 0 ? (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="h-10 px-4 text-left font-medium">Assignee</th>
                            <th className="h-10 px-4 text-center font-medium">Total</th>
                            <th className="h-10 px-4 text-center font-medium">Completed</th>
                            <th className="h-10 px-4 text-center font-medium">Active</th>
                            <th className="h-10 px-4 text-center font-medium">Overdue</th>
                            <th className="h-10 px-4 text-center font-medium">Hours</th>
                            <th className="h-10 px-4 text-center font-medium">Avg Days</th>
                            <th className="h-10 px-4 text-center font-medium">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.assigneePerformance.map((assignee) => (
                            <tr key={assignee.name} className="hover:bg-muted/50">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">{assignee.name}</p>
                                  <p className="text-xs text-muted-foreground">{assignee.email}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">{assignee.totalMatters}</td>
                              <td className="px-4 py-3 text-center">{assignee.completedMatters}</td>
                              <td className="px-4 py-3 text-center">{assignee.activeMaters}</td>
                              <td className="px-4 py-3 text-center">
                                {assignee.overdueMatters > 0 ? (
                                  <Badge variant="destructive">{assignee.overdueMatters}</Badge>
                                ) : (
                                  <span className="text-green-600">0</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">{assignee.totalHours.toFixed(1)}</td>
                              <td className="px-4 py-3 text-center">
                                {assignee.averageCompletionDays ?? "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-bold ${getPerformanceColor(assignee.performanceScore)}`}>
                                  {assignee.performanceScore}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No assignee data available for this period
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {groupBy === "day" ? "Daily" : groupBy === "week" ? "Weekly" : "Monthly"} Trends
                  </CardTitle>
                  <CardDescription>
                    Matter activity over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.timePeriodData.length > 0 ? (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="h-10 px-4 text-left font-medium">Period</th>
                            <th className="h-10 px-4 text-center font-medium">New Matters</th>
                            <th className="h-10 px-4 text-center font-medium">Completed</th>
                            <th className="h-10 px-4 text-center font-medium">Hours Logged</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.timePeriodData.map((period) => (
                            <tr key={period.period} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">{period.period}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="secondary">{period.newMatters}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline">{period.completedMatters}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">{period.totalHours.toFixed(1)}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No trend data available for this period
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Issues & Alerts
                  </CardTitle>
                  <CardDescription>
                    Matters that need attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.issues.length > 0 ? (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="h-10 px-4 text-left font-medium">Severity</th>
                            <th className="h-10 px-4 text-left font-medium">Type</th>
                            <th className="h-10 px-4 text-left font-medium">Matter</th>
                            <th className="h-10 px-4 text-left font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.issues.map((issue, idx) => (
                            <tr key={`${issue.matterId}-${idx}`} className="hover:bg-muted/50">
                              <td className="px-4 py-3">
                                <Badge variant={getSeverityColor(issue.severity)}>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 capitalize">
                                {issue.type.replace("_", " ")}
                              </td>
                              <td className="px-4 py-3 max-w-xs truncate font-medium">
                                {issue.matterTitle}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {issue.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-green-600 font-medium">No issues found!</p>
                      <p className="text-sm text-muted-foreground">
                        All matters are on track
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty State */}
      {!report && !isLoading && (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No Report Generated</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a date range and click &quot;Generate Report&quot; to create a comprehensive report
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
