"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, UserX, ChevronRight } from "lucide-react";
import Link from "next/link";

export interface AlertBannerStats {
    overdueMatters: number;
    atRiskMatters: number;
    unassignedMatters: number;
}

interface AlertBannerProps {
    stats: AlertBannerStats;
}

export function AlertBanner({ stats }: AlertBannerProps) {
    const totalAlerts = stats.overdueMatters + stats.atRiskMatters + stats.unassignedMatters;

    // Don't show banner if no alerts
    if (totalAlerts === 0) {
        return (
            <Card className="p-4 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <AlertTriangle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                            All Clear!
                        </h3>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            No critical alerts at this time. All matters are on track.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    const alerts = [
        {
            label: "Overdue Matters",
            count: stats.overdueMatters,
            icon: AlertTriangle,
            color: "red",
            filter: "overdue",
        },
        {
            label: "Due This Week",
            count: stats.atRiskMatters,
            icon: Clock,
            color: "amber",
            filter: "at-risk",
        },
        {
            label: "Unassigned",
            count: stats.unassignedMatters,
            icon: UserX,
            color: "orange",
            filter: "unassigned",
        },
    ];

    return (
        <Card className="p-5 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                            Critical Alerts
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                            {totalAlerts} {totalAlerts === 1 ? 'matter requires' : 'matters require'} immediate attention
                        </p>

                        <div className="flex flex-wrap gap-4">
                            {alerts.map((alert) => {
                                if (alert.count === 0) return null;

                                const Icon = alert.icon;
                                const colorClasses = {
                                    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                                };

                                return (
                                    <Link
                                        key={alert.label}
                                        href={`/dashboard/matters?filter=${alert.filter}`}
                                        className="group"
                                    >
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colorClasses[alert.color as keyof typeof colorClasses]} transition-all hover:scale-105 cursor-pointer`}>
                                            <Icon className="h-4 w-4" />
                                            <span className="font-semibold">{alert.count}</span>
                                            <span className="text-sm">{alert.label}</span>
                                            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                    <Link href="/dashboard/matters">
                        View All Matters
                    </Link>
                </Button>
            </div>
        </Card>
    );
}
