import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";
import "server-only";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;
const BATCH_SIZE = 100; // Process 100 matters at a time (smaller for better interruption)
const RATE_LIMIT_RETRY_DELAY_MS = 120000; // 2 minutes = 120,000ms

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface DocketwiseMatterDetail {
  id: number;
  title: string;
  number?: string | null;
  description?: string | null;
  client_id: number | null;
  attorney_id: number | null;
  user_ids?: number[] | null;
  updated_at: string | null;
  created_at: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  archived: boolean;
  type: string | null;
  status: { id: number; name: string } | string | null;
  matter_type?: { id: number; name: string } | null;
  matter_type_id?: number | null;
  workflow_stage?: { id: number; name: string } | null;
  workflow_stage_id?: number | null;
  matter_status_id?: number | null;
  client?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    company_name?: string | null;
  } | null;
  assignee?: {
    id: number;
    name: string;
  } | null;
}

// Smart rate limit handling - wait 2 minutes on 429, then fail
async function fetchWithSmartRetry(
  url: string,
  options: RequestInit,
): Promise<{ response: Response | null; rateLimited: boolean }> {
  let response = await fetch(url, options);

  // Handle rate limit (429 or 419)
  if (response.status === 419 || response.status === 429) {
    console.warn(
      `[MATTER-DETAILS-SYNC] ⚠️ Rate limited (${response.status}). Waiting 2 minutes before retry...`,
    );
    
    // Wait 2 minutes
    await delay(RATE_LIMIT_RETRY_DELAY_MS);
    
    // Retry ONCE
    response = await fetch(url, options);
    
    // If still rate limited after 2min wait, fail
    if (response.status === 419 || response.status === 429) {
      console.error(
        `[MATTER-DETAILS-SYNC] ❌ Still rate limited after 2min wait. Failing sync.`,
      );
      return { response: null, rateLimited: true };
    }
  }

  return { response, rateLimited: false };
}

/**
 * Fetch individual matter details from Docketwise API
 * This gets full assignee information, archived status, and all other details
 */
async function fetchMatterDetails(
  matterId: number,
  token: string,
): Promise<{ data: DocketwiseMatterDetail | null; rateLimited: boolean }> {
  try {
    const { response, rateLimited } = await fetchWithSmartRetry(
      `${DOCKETWISE_API_URL}/matters/${matterId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (rateLimited || !response) {
      return { data: null, rateLimited: true };
    }

    if (!response.ok) {
      console.error(
        `[MATTER-DETAILS-SYNC] Failed to fetch matter ${matterId}: ${response.status}`,
      );
      return { data: null, rateLimited: false };
    }

    const data = await response.json();
    return { data, rateLimited: false };
  } catch (error) {
    console.error(`[MATTER-DETAILS-SYNC] Error fetching matter ${matterId}:`, error);
    return { data: null, rateLimited: false };
  }
}

/**
 * Load reference data maps for resolution
 */
async function loadReferenceMaps() {
  const [teams, clients, matterTypes, statuses] = await Promise.all([
    prisma.teams.findMany({
      select: { docketwiseId: true, fullName: true, firstName: true, lastName: true, email: true },
    }),
    prisma.contacts.findMany({
      select: { docketwiseId: true, firstName: true, lastName: true, companyName: true },
    }),
    prisma.matterTypes.findMany({
      select: { docketwiseId: true, name: true },
    }),
    prisma.matterStatuses.findMany({
      select: { docketwiseId: true, name: true },
    }),
  ]);

  const teamMap = new Map<number, string>();
  for (const t of teams) {
    const name = t.fullName || `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.email;
    teamMap.set(t.docketwiseId, name);
  }

  const clientMap = new Map<number, string>();
  for (const c of clients) {
    const name = c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown Client";
    clientMap.set(c.docketwiseId, name);
  }

  const typeMap = new Map<number, string>();
  for (const t of matterTypes) {
    typeMap.set(t.docketwiseId, t.name);
  }

  const statusMap = new Map<number, string>();
  for (const s of statuses) {
    statusMap.set(s.docketwiseId, s.name);
  }

  return { teamMap, clientMap, typeMap, statusMap };
}

/**
 * Sync matter details in batches with progress tracking
 * Processes matters in DESC order (newest first) for better UX
 */
export async function syncMatterDetails(
  userId: string,
  onProgress?: (progress: { processed: number; failed: number; total: number; lastMatterId: number | null }) => void,
) {
  console.log("[MATTER-DETAILS-SYNC] Starting matter details sync...");

  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    // Load reference data
    const { teamMap, clientMap, typeMap, statusMap } = await loadReferenceMaps();
    console.log(
      `[MATTER-DETAILS-SYNC] Loaded maps: ${teamMap.size} teams, ${clientMap.size} clients, ${typeMap.size} types, ${statusMap.size} statuses`,
    );

    // Get or create sync progress
    let syncProgress = await prisma.syncProgress.findUnique({
      where: { userId_syncType: { userId, syncType: 'matter_details' } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already synced today
    if (syncProgress?.lastSyncDate) {
      const lastSyncDate = new Date(syncProgress.lastSyncDate);
      lastSyncDate.setHours(0, 0, 0, 0);
      
      if (lastSyncDate.getTime() === today.getTime() && syncProgress.status === 'completed') {
        console.log('[MATTER-DETAILS-SYNC] ✅ Already synced today. Skipping.');
        return {
          success: true,
          totalProcessed: syncProgress.totalProcessed,
          totalFailed: syncProgress.totalFailed,
          message: 'Already synced today',
        };
      }
    }

    if (!syncProgress) {
      // Initialize sync progress - start from beginning
      syncProgress = await prisma.syncProgress.create({
        data: {
          userId,
          syncType: 'matter_details',
          lastSyncedId: null,
          lastSyncDate: null,
          status: 'syncing',
          totalProcessed: 0,
          totalFailed: 0,
        },
      });
      console.log('[MATTER-DETAILS-SYNC] Starting fresh sync from beginning');
    } else {
      // Check if last sync was today but incomplete
      const lastSyncDate = syncProgress.lastSyncDate ? new Date(syncProgress.lastSyncDate) : null;
      const isTodaysSync = lastSyncDate && lastSyncDate.setHours(0,0,0,0) === today.getTime();
      
      if (isTodaysSync && syncProgress.lastSyncedId) {
        // Resume from where we left off today
        console.log(`[MATTER-DETAILS-SYNC] Resuming today's sync from ID ${syncProgress.lastSyncedId}`);
      } else {
        // New day - reset counters but keep last ID to continue DESC
        await prisma.syncProgress.update({
          where: { id: syncProgress.id },
          data: { 
            status: 'syncing', 
            totalProcessed: 0,
            totalFailed: 0,
            lastSyncedId: null, // Start from beginning for new day
            updatedAt: new Date() 
          },
        });
        syncProgress = await prisma.syncProgress.findUnique({
          where: { id: syncProgress.id },
        })!;
        console.log('[MATTER-DETAILS-SYNC] Starting new sync for today from beginning');
      }
    }

    const lastSyncedId = syncProgress!.lastSyncedId;
    console.log(
      `[MATTER-DETAILS-SYNC] Starting from matter ID: ${lastSyncedId || 'newest (DESC)'}`,
    );

    // Get matters that need details sync (DESC order - newest first)
    const mattersQueryWhere: {
      userId: string;
      discardedAt: null;
      docketwiseId?: { lt: number };
    } = {
      userId,
      discardedAt: null,
    };

    // If resuming, only get matters AFTER (less than in DESC) last synced ID
    if (lastSyncedId) {
      mattersQueryWhere.docketwiseId = { lt: lastSyncedId };
    }

    const allMatters = await prisma.matters.findMany({
      where: mattersQueryWhere,
      orderBy: {
        docketwiseId: 'desc',
      },
      select: {
        id: true,
        docketwiseId: true,
        isEdited: true,
        status: true, // Needed for status change detection
      },
    });
    const totalMatters = allMatters.length;

    console.log(`[MATTER-DETAILS-SYNC] Found ${totalMatters} matters to sync`);

    if (totalMatters === 0) {
      console.log("[MATTER-DETAILS-SYNC] No matters to sync. Marking as completed.");
      await prisma.syncProgress.update({
        where: { id: syncProgress!.id },
        data: { status: 'completed', lastSyncDate: new Date(), updatedAt: new Date() },
      });
      return {
        success: true,
        totalProcessed: syncProgress!.totalProcessed,
        totalFailed: syncProgress!.totalFailed,
        message: "All matter details are up to date",
      };
    }

    let processedCount = syncProgress!.totalProcessed;
    let failedCount = syncProgress!.totalFailed;
    let lastProcessedId: number | null = null;

    // Process in batches
    for (let i = 0; i < allMatters.length; i += BATCH_SIZE) {
      const batch = allMatters.slice(i, i + BATCH_SIZE);
      console.log(
        `[MATTER-DETAILS-SYNC] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalMatters / BATCH_SIZE)} (${batch.length} matters)`,
      );

      for (let j = 0; j < batch.length; j++) {
        const matter = batch[j];
        
        // Skip manually edited matters
        if (matter.isEdited) {
          console.log(`[MATTER-DETAILS-SYNC] Skipping edited matter ${matter.docketwiseId}`);
          processedCount++;
          continue;
        }

        // NO artificial delay - only respect API rate limits
        // Fetch matter details with smart rate limit handling
        const { data: details, rateLimited } = await fetchMatterDetails(matter.docketwiseId, token);

        // If rate limited after 2min retry, FAIL the sync
        if (rateLimited) {
          console.error(`[MATTER-DETAILS-SYNC] ❌ Rate limit exceeded. Failing sync.`);
          await prisma.syncProgress.update({
            where: { id: syncProgress!.id },
            data: {
              status: 'failed',
              failureReason: 'Rate limit exceeded after 2min retry',
              lastSyncedId: lastProcessedId,
              totalProcessed: processedCount,
              totalFailed: failedCount,
              updatedAt: new Date(),
            },
          });
          return {
            success: false,
            totalProcessed: processedCount,
            totalFailed: failedCount,
            message: 'Sync failed: Rate limit exceeded',
          };
        }

        if (!details) {
          console.error(`[MATTER-DETAILS-SYNC] Failed to fetch details for matter ${matter.docketwiseId}`);
          failedCount++;
          continue;
        }
        
        // Log progress every 10 matters
        if ((j + 1) % 10 === 0) {
          console.log(`[MATTER-DETAILS-SYNC] Batch progress: ${j + 1}/${batch.length} matters processed in current batch`);
        }

        // Resolve all fields from details
        const clientName = details.client_id ? clientMap.get(details.client_id) : null;
        const matterTypeId = details.matter_type_id ?? details.matter_type?.id ?? null;
        const matterType = matterTypeId ? typeMap.get(matterTypeId) : details.type;

        // Resolve status
        let statusId: number | null = null;
        let statusName: string | null = null;

        if (details.matter_status_id) {
          statusId = details.matter_status_id;
          statusName = statusMap.get(statusId) ?? null;
        } else if (details.workflow_stage_id) {
          statusId = details.workflow_stage_id;
          statusName = statusMap.get(statusId) ?? details.workflow_stage?.name ?? null;
        } else if (typeof details.status === "object" && details.status) {
          statusId = details.status.id;
          statusName = details.status.name;
        } else if (typeof details.status === "string") {
          statusName = details.status;
        }

        // Resolve assignees - use ALL available sources
        const assigneeIds: number[] = [];
        const assigneeNames: string[] = [];

        // Primary attorney
        if (details.attorney_id) {
          assigneeIds.push(details.attorney_id);
          const name = teamMap.get(details.attorney_id);
          if (name) assigneeNames.push(name);
        }

        // User IDs (additional assignees)
        if (details.user_ids && Array.isArray(details.user_ids)) {
          for (const userId of details.user_ids) {
            if (!assigneeIds.includes(userId)) {
              assigneeIds.push(userId);
              const name = teamMap.get(userId);
              if (name) assigneeNames.push(name);
            }
          }
        }

        // Assignee object (fallback)
        if (details.assignee?.id && !assigneeIds.includes(details.assignee.id)) {
          assigneeIds.push(details.assignee.id);
          if (details.assignee.name) {
            assigneeNames.push(details.assignee.name);
          }
        }

        // Check if status changed (for email notification)
        const oldStatus = matter.status;
        const statusChanged = oldStatus && statusName && oldStatus !== statusName;

        // Update matter with full details
        const updatedMatter = await prisma.matters.update({
          where: { id: matter.id },
          data: {
            title: details.title || "Untitled Matter",
            description: details.description ?? null,
            matterType: matterType ?? null,
            matterTypeId: matterTypeId,
            status: statusName,
            statusId: statusId,
            clientName: clientName,
            clientId: details.client_id,
            teamId: details.attorney_id, // Primary attorney as teamId
            assignees: assigneeNames.length > 0 ? assigneeNames.join(', ') : null,
            docketwiseUserIds: assigneeIds.length > 0 ? JSON.stringify(assigneeIds) : null,
            archived: details.archived,
            openedAt: details.opened_at ? new Date(details.opened_at) : null,
            closedAt: details.closed_at ? new Date(details.closed_at) : null,
            docketwiseCreatedAt: details.created_at ? new Date(details.created_at) : null,
            docketwiseUpdatedAt: details.updated_at ? new Date(details.updated_at) : null,
            lastSyncedAt: new Date(),
          },
        });

        // Send email ONLY if matter existed before AND status changed
        if (statusChanged) {
          try {
            const { detectNotificationType, sendNotification } = await import("@/lib/notifications/notification-service");
            const notificationType = detectNotificationType(oldStatus, statusName);
            
            if (notificationType) {
              await sendNotification({
                type: notificationType,
                matterId: updatedMatter.id,
                matterTitle: updatedMatter.title,
                clientName: updatedMatter.clientName,
                matterType: updatedMatter.matterType,
                status: statusName,
                oldStatus: oldStatus,
              });
              console.log(`[MATTER-DETAILS-SYNC] Sent ${notificationType} notification for matter ${matter.docketwiseId}`);
            }
          } catch (error) {
            console.error(`[MATTER-DETAILS-SYNC] Failed to send notification:`, error);
          }
        }

        processedCount++;
        lastProcessedId = matter.docketwiseId;

        // Report progress
        if (onProgress) {
          onProgress({
            processed: processedCount,
            failed: failedCount,
            total: totalMatters,
            lastMatterId: lastProcessedId,
          });
        }
      }

      // Update sync progress after each batch
      await prisma.syncProgress.update({
        where: { id: syncProgress!.id },
        data: {
          lastSyncedId: lastProcessedId,
          totalProcessed: processedCount,
          totalFailed: failedCount,
          updatedAt: new Date(),
        },
      });

      console.log(
        `[MATTER-DETAILS-SYNC] Batch complete. Progress: ${processedCount}/${totalMatters} processed, ${failedCount} failed`,
      );

      // No artificial pause between batches - API rate limits handled in fetchWithSmartRetry
    }

    // Mark sync as completed with today's date
    const completionDate = new Date();
    await prisma.syncProgress.update({
      where: { id: syncProgress!.id },
      data: { 
        status: 'completed', 
        lastSyncDate: completionDate,
        lastSyncedId: null, // Reset for next day
        totalProcessed: processedCount,
        totalFailed: failedCount,
        updatedAt: completionDate 
      },
    });

    console.log(
      `[MATTER-DETAILS-SYNC] ✅ Sync complete for today: ${processedCount} processed, ${failedCount} failed`,
    );

    return {
      success: true,
      totalProcessed: processedCount,
      totalFailed: failedCount,
      message: `Successfully synced ${processedCount} matter details`,
    };
  } catch (error) {
    console.error("[MATTER-DETAILS-SYNC] Fatal error:", error);
    throw error;
  }
}
