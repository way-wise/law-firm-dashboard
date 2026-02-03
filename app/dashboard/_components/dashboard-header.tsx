"use client";

import { useState, useTransition } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function DashboardHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
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

  // Handle date range change from picker
  const handleDateRangeChange = (newRange: DateRange | undefined) => {
    // If reset (undefined or no dates), clear URL params and reset to default
    if (!newRange || (!newRange.from && !newRange.to)) {
      const defaultRange = {
        from: subDays(new Date(), 30),
        to: new Date(),
      };
      setDateRange(defaultRange);
      
      startTransition(() => {
        router.push('/dashboard');
        router.refresh();
      });
      return;
    }
    
    setDateRange(newRange);
    
    if (newRange.from && newRange.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("dateFrom", format(newRange.from, "yyyy-MM-dd"));
      params.set("dateTo", format(newRange.to, "yyyy-MM-dd"));
      
      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`);
        router.refresh();
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Executive KPI monitoring and team performance analytics
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isPending && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder="Last 30 days"
        />
      </div>
    </div>
  );
}
