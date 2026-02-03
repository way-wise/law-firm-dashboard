"use client";

import { useEffect, useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

export function DashboardHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize from URL or default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    
    if (from && to) {
      return {
        from: new Date(from),
        to: new Date(to),
      };
    }
    
    return {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
  });

  // Update URL when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("dateFrom", format(dateRange.from, "yyyy-MM-dd"));
      params.set("dateTo", format(dateRange.to, "yyyy-MM-dd"));
      router.push(`/dashboard?${params.toString()}`);
    }
  }, [dateRange, router, searchParams]);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Executive KPI monitoring and team performance analytics
        </p>
      </div>
      <div className="flex items-center gap-3">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder="Last 30 days"
        />
      </div>
    </div>
  );
}
