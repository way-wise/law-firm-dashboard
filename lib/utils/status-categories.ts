/**
 * Status categorization system for matter workflow stages
 * Used throughout the application for consistent status grouping
 */

export const STATUS_CATEGORIES = {
  pending: ['pending', 'drafting', 'preparing', 'waiting', 'processing'],
  filed: ['filed', 'submitted', 'case filed'],
  rfe: ['request for evidence', 'rfe received', 'rfe filed'],
  interview: ['interview', 'biometrics', 'oath ceremony'],
  approved: ['approved', 'granted', 'card received', 'visa granted'],
  denied: ['denied', 'case denied', 'rejected'],
  closed: ['closed'],
} as const;

export type StatusCategory = keyof typeof STATUS_CATEGORIES | 'other';

/**
 * Categorize a status name into one of the predefined categories
 * @param statusName - The status name to categorize
 * @returns The category name (pending, filed, rfe, etc.) or 'other'
 */
export function categorizeStatus(statusName: string | null | undefined): StatusCategory {
  if (!statusName) return 'other';
  
  const lowerName = statusName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(STATUS_CATEGORIES)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category as StatusCategory;
    }
  }
  
  return 'other';
}

/**
 * Get display-friendly label for a status category
 */
export function getCategoryLabel(category: StatusCategory): string {
  const labels: Record<StatusCategory, string> = {
    pending: 'Pending/Drafting',
    filed: 'Filed',
    rfe: 'RFE',
    interview: 'Interview',
    approved: 'Approved',
    denied: 'Denied',
    closed: 'Closed',
    other: 'Other',
  };
  
  return labels[category];
}

/**
 * Count matters by status category from a list of matters
 * @param matters - Array of matters with status field
 * @returns Map of category to count
 */
export function countMattersByCategory(
  matters: Array<{ status: string | null }>
): Map<StatusCategory, number> {
  const categoryCounts = new Map<StatusCategory, number>();
  
  for (const matter of matters) {
    const category = categorizeStatus(matter.status);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }
  
  return categoryCounts;
}
