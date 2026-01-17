import "server-only";
import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Rate limiting helper - Docketwise allows 120 requests/minute
// Using minimal delay since we batch operations
const RATE_LIMIT_DELAY_MS = 100; // 100ms between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Docketwise API Types (based on actual API response)
interface DocketwiseMatter {
  id: number;
  title: string;
  number?: string | null;
  description?: string | null;
  client_id: number | null;
  attorney_id: number | null; // This is what Docketwise actually returns
  updated_at: string | null;
  created_at: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  archived: boolean;
  discarded_at?: string | null;
  firm_id?: number;
  receipt_number?: string | null;
  priority_date?: string | null;
  priority_date_status?: string;
  type: string | null;
  status: { id: number; name: string } | string | null;
  matter_type?: { id: number; name: string } | null;
  workflow_stage?: { id: number; name: string } | null;
}

interface DocketwiseContact {
  id: number;
  first_name: string | null;
  last_name: string | null;
}

// Docketwise user response structure (from /users endpoint)
interface DocketwiseUser {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
  attorney_profile?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Docketwise pagination from X-Pagination header
interface DocketwisePagination {
  total: number;
  next_page: number | null;
  previous_page: number | null;
  total_pages: number;
}

// Sync matters from Docketwise
export async function syncMatters(userId: string) {
  console.log("[SYNC] Starting sync for user:", userId);
  
  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    console.log("[SYNC] Token obtained, fetching matters...");

    let page = 1;
    let recordsProcessed = 0;
    const recordsCreated = 0;
    const recordsUpdated = 0;
    const MAX_PAGES = 20; // Safety limit - 200 records/page = 4000 matters max

    while (page <= MAX_PAGES) {
      console.log(`[SYNC] Fetching page ${page}...`);
      
      const response = await fetch(`${DOCKETWISE_API_URL}/matters?page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SYNC] API error ${response.status}:`, errorText);
        throw new Error(`Docketwise API error: ${response.status}`);
      }

      // Parse pagination from X-Pagination header (Docketwise standard)
      const paginationHeader = response.headers.get("X-Pagination");
      let pagination: DocketwisePagination | null = null;
      if (paginationHeader) {
        try {
          pagination = JSON.parse(paginationHeader) as DocketwisePagination;
        } catch {
          console.warn("[SYNC] Failed to parse X-Pagination header");
        }
      }

      const data = await response.json() as DocketwiseMatter[];
      const matters: DocketwiseMatter[] = Array.isArray(data) ? data : [];
      recordsProcessed += matters.length;
      
      console.log(`[SYNC] Page ${page}: ${matters.length} matters, pagination:`, pagination);
      
      // Log first matter to see structure (only on first page)
      if (page === 1 && matters.length > 0) {
        console.log("[SYNC] Sample matter structure:", JSON.stringify(matters[0], null, 2));
        console.log("[SYNC] Sample matter attorney_id:", matters[0].attorney_id);
        console.log("[SYNC] Sample matter keys:", Object.keys(matters[0]));
      }

      // Get all docketwise IDs from this page
      const docketwiseIds = matters.map(m => m.id);
      
      // Batch fetch existing matters to check isEdited status
      const existingMatters = await prisma.matters.findMany({
        where: { docketwiseId: { in: docketwiseIds } },
        select: { docketwiseId: true, isEdited: true },
      });
      const editedMatterIds = new Set(
        existingMatters.filter(m => m.isEdited).map(m => m.docketwiseId)
      );

      // Process matters - skip edited ones
      for (const docketwiseMatter of matters) {
        try {
          // Skip update if user has edited this matter
          if (editedMatterIds.has(docketwiseMatter.id)) {
            // Only update lastSyncedAt to track that we checked it
            await prisma.matters.update({
              where: { docketwiseId: docketwiseMatter.id },
              data: { lastSyncedAt: new Date() },
            });
            continue;
          }

          await prisma.matters.upsert({
            where: { docketwiseId: docketwiseMatter.id },
            update: {
              docketwiseUpdatedAt: docketwiseMatter.updated_at ? new Date(docketwiseMatter.updated_at) : null,
              title: docketwiseMatter.title || "Untitled",
              matterType: docketwiseMatter.matter_type?.name || docketwiseMatter.type || null,
              matterTypeId: docketwiseMatter.matter_type?.id || null,
              workflowStage: docketwiseMatter.workflow_stage?.name || null,
              workflowStageId: docketwiseMatter.workflow_stage?.id || null,
              clientId: docketwiseMatter.client_id || null,
              status: typeof docketwiseMatter.status === 'object' && docketwiseMatter.status ? docketwiseMatter.status.name : docketwiseMatter.status,
              statusId: typeof docketwiseMatter.status === 'object' && docketwiseMatter.status ? docketwiseMatter.status.id : null,
              openedAt: docketwiseMatter.opened_at ? new Date(docketwiseMatter.opened_at) : null,
              closedAt: docketwiseMatter.closed_at ? new Date(docketwiseMatter.closed_at) : null,
              docketwiseUserIds: docketwiseMatter.attorney_id ? String(docketwiseMatter.attorney_id) : null,
              lastSyncedAt: new Date(),
              isStale: false,
            },
            create: {
              docketwiseId: docketwiseMatter.id,
              docketwiseUpdatedAt: docketwiseMatter.updated_at ? new Date(docketwiseMatter.updated_at) : null,
              title: docketwiseMatter.title || "Untitled",
              matterType: docketwiseMatter.matter_type?.name || docketwiseMatter.type || null,
              matterTypeId: docketwiseMatter.matter_type?.id || null,
              workflowStage: docketwiseMatter.workflow_stage?.name || null,
              workflowStageId: docketwiseMatter.workflow_stage?.id || null,
              clientId: docketwiseMatter.client_id || null,
              status: typeof docketwiseMatter.status === 'object' && docketwiseMatter.status ? docketwiseMatter.status.name : docketwiseMatter.status,
              statusId: null,
              openedAt: docketwiseMatter.opened_at ? new Date(docketwiseMatter.opened_at) : null,
              closedAt: docketwiseMatter.closed_at ? new Date(docketwiseMatter.closed_at) : null,
              docketwiseUserIds: docketwiseMatter.attorney_id ? String(docketwiseMatter.attorney_id) : null,
              userId,
              lastSyncedAt: new Date(),
              isStale: false,
            },
          });
        } catch (error) {
          console.error(`[SYNC] Error saving matter ${docketwiseMatter.id}:`, error);
        }
      }

      // Batch fetch all clients once per page
      if (page === 1) { // Only fetch on first page
        const clientIds = [...new Set(matters.filter((m) => m.client_id).map((m) => m.client_id))];
        if (clientIds.length > 0) {
          console.log(`[SYNC] Fetching all clients...`);
          try {
            const clientsResponse = await fetch(`${DOCKETWISE_API_URL}/contacts`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            
            if (clientsResponse.ok) {
              const allClients = await clientsResponse.json() as DocketwiseContact[];
              const clientMap = new Map<number, string | null>(
                allClients.map((c) => [
                  c.id,
                  `${c.first_name || ""} ${c.last_name || ""}`.trim() || null,
                ])
              );

              // Update all matters with client names (only if not edited by user)
              const mattersToUpdate = await prisma.matters.findMany({
                where: { 
                  userId, 
                  clientId: { not: null },
                  isEdited: false, // Don't overwrite user-edited matters
                },
                select: { id: true, clientId: true },
              });

              for (const matter of mattersToUpdate) {
                if (matter.clientId && clientMap.has(matter.clientId)) {
                  await prisma.matters.update({
                    where: { id: matter.id },
                    data: { clientName: clientMap.get(matter.clientId) as string | null },
                  });
                }
              }
              console.log(`[SYNC] Updated client names for ${mattersToUpdate.length} matters`);
            }
          } catch (clientError) {
            console.error(`[SYNC] Error fetching clients:`, clientError);
          }
        }
      }

      // Check if there are more pages
      // Use pagination header if available, otherwise check if we got a full page (200 records)
      const hasNextPage = pagination 
        ? (pagination.next_page !== null && pagination.next_page !== undefined)
        : matters.length >= 200; // Docketwise returns max 200 per page
      
      if (!hasNextPage || matters.length === 0) {
        console.log(`[SYNC] No more pages (hasNextPage=${hasNextPage}, matters=${matters.length}), stopping`);
        break;
      }

      // Rate limiting - small delay between pages
      await delay(RATE_LIMIT_DELAY_MS);
      page++;
    }

    if (page > MAX_PAGES) {
      console.warn(`[SYNC] Reached max page limit of ${MAX_PAGES}`);
    }

    console.log(`[SYNC] Completed: ${recordsProcessed} total records processed`);

    // After all matters are synced, fetch users and update paralegal assignments
    console.log(`[SYNC] Fetching all users for paralegal assignments...`);
    try {
      const usersResponse = await fetch(`${DOCKETWISE_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (usersResponse.ok) {
        const allUsers = await usersResponse.json() as DocketwiseUser[];
        const userMap = new Map<number, string | null>(
          allUsers.map((u) => [
            u.id,
            u.attorney_profile 
              ? `${u.attorney_profile.first_name || ""} ${u.attorney_profile.last_name || ""}`.trim() || u.email
              : u.email,
          ])
        );

        console.log(`[SYNC] Fetched ${allUsers.length} users from Docketwise`);

        // Update all matters that have attorney_id (stored in docketwiseUserIds)
        // Only update paralegalAssigned if isEdited is false (not manually edited by user)
        const mattersToUpdate = await prisma.matters.findMany({
          where: { 
            userId, 
            docketwiseUserIds: { not: null },
            isEdited: false, // Don't overwrite user-edited matters
          },
          select: { id: true, docketwiseUserIds: true },
        });

        console.log(`[SYNC] Found ${mattersToUpdate.length} matters with attorney_id to process`);

        let updatedCount = 0;
        for (const matter of mattersToUpdate) {
          if (matter.docketwiseUserIds) {
            // docketwiseUserIds now stores attorney_id as a simple string
            const attorneyId = parseInt(matter.docketwiseUserIds, 10);
            if (!isNaN(attorneyId)) {
              const userName = userMap.get(attorneyId);
              if (userName) {
                await prisma.matters.update({
                  where: { id: matter.id },
                  data: { paralegalAssigned: userName },
                });
                updatedCount++;
              }
            }
          }
        }
        console.log(`[SYNC] Updated ${updatedCount} paralegal assignments (attorney names)`);
      }
    } catch (userError) {
      console.error(`[SYNC] Error fetching users:`, userError);
    }

    return {
      success: true,
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
    };
  } catch (error) {
    console.error("[SYNC] Error for user:", userId, error);
    throw error;
  }
}
