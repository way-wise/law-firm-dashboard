"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Loader2 } from "lucide-react";
import { client } from "@/lib/orpc/client";

interface DashboardHeaderProps {
  onStatsUpdate?: (stats: { newMattersThisMonth: number; rfeFrequency: number }) => void;
}

export function DashboardHeader({ onStatsUpdate }: DashboardHeaderProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch filtered stats when date range changes
  useEffect(() => {
    const fetchFilteredStats = async () => {
      if (!dateRange?.from || !dateRange?.to || !onStatsUpdate) return;
      
      setIsLoading(true);
      try {
        const stats = await client.dashboard.getStats({
          dateFrom: dateRange.from.toISOString(),
          dateTo: dateRange.to.toISOString(),
        });
        onStatsUpdate({
          newMattersThisMonth: stats.newMattersThisMonth,
          rfeFrequency: stats.rfeFrequency,
        });
      } catch (error) {
        console.error("Failed to fetch filtered stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredStats();
  }, [dateRange, onStatsUpdate]);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Executive KPI monitoring and team performance analytics
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder="Last 30 days"
        />
      </div>
    </div>
  );
}
