/**
 * Utility functions for determining matter activity status
 */

import { classifyStatus } from "@/lib/status-classifier";

export type MatterActivityStatus = "active" | "stale" | "archived";

interface MatterForStatus {
  archived?: boolean;
  closedAt?: Date | null;
  status?: string | null;
  docketwiseUpdatedAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Determine if a matter is active, stale, or archived based on:
 * 1. Archived flag - if true, it's archived
 * 2. Status classifier - if completed (filed/approved/denied/closed), it's archived
 * 3. Last update date - if not updated within staleMeasurementDays, it's stale
 * 4. Otherwise - it's active
 */
export function getMatterActivityStatus(
  matter: MatterForStatus,
  staleMeasurementDays: number = 10
): MatterActivityStatus {
  // Check if explicitly archived
  if (matter.archived) {
    return "archived";
  }

  // Check if closed by closedAt date
  if (matter.closedAt) {
    return "archived";
  }

  // Use status classifier to check if matter is completed (filed/approved/denied/closed)
  const classification = classifyStatus(matter.status);
  if (classification.isCompleted) {
    // Filed, approved, denied, closed = archived (work is done)
    return "archived";
  }

  // Matter is NOT completed, check for staleness
  // Stale = active work but not updated within staleMeasurementDays
  const lastUpdate = matter.docketwiseUpdatedAt || matter.updatedAt;
  if (lastUpdate) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate > staleMeasurementDays) {
      return "stale";
    }
  }

  // Active = NOT completed AND updated recently
  return "active";
}

/**
 * Get display label for activity status
 */
export function getActivityStatusLabel(status: MatterActivityStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "stale":
      return "Stale";
    case "archived":
      return "Archived";
  }
}

/**
 * Get color/variant for activity status badge
 */
export function getActivityStatusVariant(status: MatterActivityStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "stale":
      return "secondary";
    case "archived":
      return "outline";
  }
}
