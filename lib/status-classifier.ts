/**
 * Status Classification System
 * 
 * Provides accurate matter status categorization based on status names
 * using fuzzy matching and keyword detection
 */

export interface StatusClassification {
  isFiled: boolean;
  isApproved: boolean;
  isDenied: boolean;
  isRFE: boolean;
  isRFEFiled: boolean;
  isPending: boolean;
  isDrafting: boolean;
  isClosed: boolean;
  isArchived: boolean;
  isActive: boolean;
  isCompleted: boolean; // Filed, approved, closed = completed
  category: 'filed' | 'approved' | 'denied' | 'rfe' | 'pending' | 'drafting' | 'closed' | 'completed' | 'unknown';
}

/**
 * Classify a matter status based on status name
 */
export function classifyStatus(statusName: string | null | undefined): StatusClassification {
  const normalized = (statusName || '').toLowerCase().trim();
  
  // Default classification
  const classification: StatusClassification = {
    isFiled: false,
    isApproved: false,
    isDenied: false,
    isRFE: false,
    isRFEFiled: false,
    isPending: false,
    isDrafting: false,
    isClosed: false,
    isArchived: false,
    isActive: false,
    isCompleted: false,
    category: 'unknown',
  };

  if (!normalized) return classification;

  // === COMPLETED STATES (NOT ACTIVE) ===
  
  // CLOSED - Case is done
  if (
    normalized.includes('closed') ||
    normalized.includes('card received') ||
    normalized.includes('beneficiary arrived') ||
    normalized === 'open' // "Open" without context is often stale/inactive
  ) {
    classification.isClosed = true;
    classification.isCompleted = true;
    classification.category = 'closed';
    classification.isActive = false;
  }

  // FILED/SUBMITTED - Work is DONE, case submitted to authorities
  if (
    normalized.includes('filed') ||
    normalized.includes('case filed') ||
    normalized.includes('submitted') ||
    normalized.includes('request has been submitted')
  ) {
    classification.isFiled = true;
    classification.isCompleted = true;
    classification.category = 'completed';
    classification.isActive = false; // COMPLETED, not active
  }

  // APPROVED - Case approved or granted (SUCCESS - COMPLETED)
  if (
    normalized.includes('approved') ||
    normalized.includes('granted') ||
    normalized.includes('case approved') ||
    normalized.includes('visa granted') ||
    normalized.includes('immigrant visa approved') ||
    normalized.includes('certificate received')
  ) {
    classification.isApproved = true;
    classification.isCompleted = true;
    classification.category = 'approved';
    classification.isActive = false; // COMPLETED
  }

  // DENIED - Case denied (END STATE - COMPLETED)
  if (
    normalized.includes('denied') ||
    normalized.includes('case denied') ||
    normalized.includes('rejected')
  ) {
    classification.isDenied = true;
    classification.isCompleted = true;
    classification.category = 'denied';
    classification.isActive = false; // COMPLETED
  }

  // === ACTIVE STATES (WORK IN PROGRESS) ===

  // DRAFTING - Preparing forms/documents (ACTIVE)
  if (
    normalized.includes('drafting') ||
    normalized.includes('preparing') ||
    normalized.includes('prepare') ||
    normalized.includes('document collection') ||
    normalized.includes('case evaluation')
  ) {
    classification.isDrafting = true;
    classification.category = 'drafting';
    classification.isActive = true; // ACTIVE - work being done
  }

  // RFE - Request for Evidence RECEIVED (ACTIVE - needs response)
  if (
    (normalized.includes('request for evidence') && normalized.includes('received')) ||
    (normalized.includes('rfe') && normalized.includes('received'))
  ) {
    classification.isRFE = true;
    classification.category = 'rfe';
    classification.isActive = true; // ACTIVE - needs response

    // Check if RFE response was filed (then becomes completed)
    if (normalized.includes('filed') && normalized.includes('response')) {
      classification.isRFEFiled = true;
      classification.isCompleted = true;
      classification.isActive = false; // Response filed = completed
    }
  }

  // PENDING - Waiting for something (ACTIVE if not yet filed)
  if (
    normalized.includes('pending') ||
    normalized.includes('waiting') ||
    normalized.includes('scheduled')
  ) {
    // Only active if NOT already filed/completed
    if (!classification.isCompleted) {
      classification.isPending = true;
      if (classification.category === 'unknown') {
        classification.category = 'pending';
      }
      classification.isActive = true; // ACTIVE - waiting for action
    }
  }

  // NVC/Processing - Active processing stages
  if (
    normalized.includes('nvc processing') ||
    normalized.includes('interview') ||
    normalized.includes('hearing') ||
    (normalized.includes('processing') && !classification.isCompleted)
  ) {
    if (!classification.isCompleted) {
      classification.isPending = true;
      if (classification.category === 'unknown') {
        classification.category = 'pending';
      }
      classification.isActive = true; // ACTIVE processing
    }
  }

  return classification;
}

/**
 * Check if a matter is active based on status and staleness
 */
export function isMatterActive(
  statusName: string | null | undefined,
  lastUpdated: Date | null | undefined,
  staleDays: number = 30
): boolean {
  const classification = classifyStatus(statusName);
  
  // Closed, approved, or denied cases are not active
  if (classification.isClosed || classification.isApproved || classification.isDenied) {
    return false;
  }

  // If no last updated date, consider active if status suggests activity
  if (!lastUpdated) {
    return classification.isActive;
  }

  // Check staleness
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
  
  // If stale, not active
  if (daysSinceUpdate > staleDays) {
    return false;
  }

  return classification.isActive;
}

/**
 * Check if a matter is stale
 */
export function isMatterStale(
  lastUpdated: Date | null | undefined,
  staleDays: number = 30
): boolean {
  if (!lastUpdated) return false;
  
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceUpdate > staleDays;
}

/**
 * Check if a matter is overdue
 * Overdue = deadline passed AND not closed/approved/denied
 */
export function isMatterOverdue(
  deadline: Date | null | undefined,
  statusName: string | null | undefined
): boolean {
  if (!deadline) return false;
  
  const classification = classifyStatus(statusName);
  
  // Don't count as overdue if case is closed, approved, or denied
  if (classification.isClosed || classification.isApproved || classification.isDenied) {
    return false;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  return deadlineDate < now;
}
