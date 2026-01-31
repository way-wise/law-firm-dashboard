"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { client } from "@/lib/orpc/client";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

export function DashboardHeader() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const router = useRouter();

  const handleSyncStats = async () => {
    setIsSyncing(true);
    try {
      await client.dashboard.syncStats({});
      router.refresh(); // Refresh the page to show new stats
    } catch (error) {
      console.error("Failed to sync stats:", error);
    } finally {
      setIsSyncing(false);
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
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder="Last 30 days"
        />
        <Button
          onClick={handleSyncStats}
          disabled={isSyncing}
          variant="outline"
          size="lg"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Stats..." : "Sync Stats"}
        </Button>
      </div>
    </div>
  );
}
