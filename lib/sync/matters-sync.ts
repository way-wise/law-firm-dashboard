import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";
import "server-only";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;
const RATE_LIMIT_DELAY_MS = 600; // 120 requests/min = 600ms between requests
const MAX_RETRIES = 3;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 419 || response.status === 429) {
      if (attempt < retries) {
        const backoffMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[MATTERS-SYNC] Rate limited (${response.status}), waiting ${backoffMs}ms before retry ${attempt + 1}/${retries}`,
        );
        await delay(backoffMs);
        continue;
      }
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

interface DocketwisePagination {
  total: number;
  next_page: number | null;
  previous_page: number | null;
  total_pages: number;
}

interface DocketwiseMatter {
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
}

/**
 * Sync all matters from Docketwise to local database
 * Uses rate limiting and pagination to handle large datasets
 */
export async function syncMatters(userId: string) {
  console.log("[MATTERS-SYNC] Starting matter sync...");

  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    // Load reference data maps for resolution
    const [userMap, clientMap, typeMap, statusMap] = await Promise.all([
      loadUserMap(),
      loadClientMap(),
      loadMatterTypeMap(),
      loadStatusMap(),
    ]);

    console.log(
      `[MATTERS-SYNC] Loaded maps: ${userMap.size} users, ${clientMap.size} clients, ${typeMap.size} types, ${statusMap.size} statuses`,
    );

    // Fetch all matters with pagination
    let matterPage = 1;
    const allMatters: DocketwiseMatter[] = [];

    while (true) {
      // Rate limiting
      if (matterPage > 1) {
        await delay(RATE_LIMIT_DELAY_MS);
      }

      const mattersResponse = await fetchWithRetry(
        `${DOCKETWISE_API_URL}/matters?page=${matterPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!mattersResponse.ok) {
        console.error(
          `[MATTERS-SYNC] Failed to fetch matters page ${matterPage}: ${mattersResponse.status}`,
        );
        break;
      }

      const pageMatters = (await mattersResponse.json()) as DocketwiseMatter[];
      if (pageMatters.length === 0) break;

      allMatters.push(...pageMatters);
      console.log(
        `[MATTERS-SYNC] Fetched matters page ${matterPage}: ${pageMatters.length} matters (total: ${allMatters.length})`,
      );

      // Check pagination
      const pagination = mattersResponse.headers.get("X-Pagination");
      if (pagination) {
        try {
          const pag = JSON.parse(pagination) as DocketwisePagination;
          if (!pag.next_page) break;
        } catch {
          if (pageMatters.length < 200) break;
        }
      } else if (pageMatters.length < 200) {
        break;
      }

      matterPage++;
    }

    console.log(`[MATTERS-SYNC] Loaded ${allMatters.length} total matters from Docketwise`);

    
    // Fetch all existing matters once for comparison
    const existingMattersMap = new Map<number, { id: string; isEdited: boolean; status: string | null }>();
    const existingMatters = await prisma.matters.findMany({
      where: { userId },
      select: { docketwiseId: true, id: true, isEdited: true, status: true },
    });
    
    for (const m of existingMatters) {
      existingMattersMap.set(m.docketwiseId, { id: m.id, isEdited: m.isEdited, status: m.status });
    }

    console.log(`[MATTERS-SYNC] Found ${existingMattersMap.size} existing matters in DB`);

    // Prepare all matter data
    const mattersToCreate: Array<{
      docketwiseId: number;
      docketwiseCreatedAt: Date | null;
      docketwiseUpdatedAt: Date | null;
      title: string;
      description: string | null;
      matterType: string | null;
      matterTypeId: number | null;
      status: string | null;
      statusId: number | null;
      clientName: string | null;
      clientId: number | null;
      assignees: string | null;
      docketwiseUserIds: string;
      openedAt: Date | null;
      closedAt: Date | null;
      lastSyncedAt: Date;
      userId: string;
    }> = [];
    
    const mattersToUpdate: Array<{ id: string; data: typeof mattersToCreate[0] }> = [];

    for (const matter of allMatters) {
      // Resolve client name
      const clientName = resolveClientName(matter, clientMap);
      
      // Resolve matter type
      const matterTypeId = matter.matter_type_id ?? matter.matter_type?.id ?? null;
      const matterType = matterTypeId ? typeMap.get(matterTypeId) : matter.type;
      
      // Resolve status
      let statusId: number | null = null;
      let statusName: string | null = null;
      
      if (matter.matter_status_id) {
        statusId = matter.matter_status_id;
        statusName = statusMap.get(statusId) ?? null;
      } else if (matter.workflow_stage_id) {
        statusId = matter.workflow_stage_id;
        statusName = statusMap.get(statusId) ?? matter.workflow_stage?.name ?? null;
      } else if (typeof matter.status === "object" && matter.status) {
        statusId = matter.status.id;
        statusName = matter.status.name;
      } else if (typeof matter.status === "string") {
        statusName = matter.status;
      }
      
      // Resolve assignees from attorney_id (available in list endpoint)
      const assigneesStr = resolveAssignees(matter, userMap);
      const attorneyIdStr = matter.attorney_id ? String(matter.attorney_id) : "";

      const dbMatterData = {
        docketwiseId: matter.id,
        docketwiseCreatedAt: matter.created_at ? new Date(matter.created_at) : null,
        docketwiseUpdatedAt: matter.updated_at ? new Date(matter.updated_at) : null,
        title: matter.title || "Untitled Matter",
        description: matter.description ?? null,
        matterType: matterType ?? null,
        matterTypeId: matterTypeId,
        status: statusName,
        statusId: statusId,
        clientName: clientName,
        clientId: matter.client_id,
        teamId: matter.attorney_id, // Save attorney_id as teamId foreign key
        assignees: assigneesStr, // Legacy - keep for backward compatibility
        docketwiseUserIds: attorneyIdStr, // Legacy - keep for backward compatibility
        openedAt: matter.opened_at ? new Date(matter.opened_at) : null,
        closedAt: matter.closed_at ? new Date(matter.closed_at) : null,
        lastSyncedAt: new Date(),
        userId: userId,
      };

      const existing = existingMattersMap.get(matter.id);
      if (existing) {
        // Only update if not manually edited
        if (!existing.isEdited) {
          mattersToUpdate.push({ id: existing.id, data: dbMatterData });
        }
      } else {
        mattersToCreate.push(dbMatterData);
      }
    }

    console.log(`[MATTERS-SYNC] Prepared ${mattersToCreate.length} new matters, ${mattersToUpdate.length} updates`);

    // Bulk insert new matters
    let createdCount = 0;
    if (mattersToCreate.length > 0) {
      const BULK_INSERT_SIZE = 500;
      for (let i = 0; i < mattersToCreate.length; i += BULK_INSERT_SIZE) {
        const chunk = mattersToCreate.slice(i, i + BULK_INSERT_SIZE);
        await prisma.matters.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        createdCount += chunk.length;
        console.log(`[MATTERS-SYNC] Created batch: ${createdCount}/${mattersToCreate.length}`);
      }
    }

    // Bulk update existing matters
    let updatedCount = 0;
    if (mattersToUpdate.length > 0) {
      const UPDATE_BATCH_SIZE = 10; // Further reduced - even 25 was timing out
      for (let i = 0; i < mattersToUpdate.length; i += UPDATE_BATCH_SIZE) {
        const chunk = mattersToUpdate.slice(i, i + UPDATE_BATCH_SIZE);
        
        // Sequential updates for remote database (no transaction to avoid timeout)
        for (const item of chunk) {
          // Record status change in timeline history before updating
          const existing = existingMatters.find(m => m.id === item.id);
          if (existing && item.data.status && existing.status !== item.data.status) {
            await prisma.matterStatusHistory.create({
              data: { matterId: item.id, status: item.data.status, source: 'sync' },
            }).catch(err => console.error(`[MATTERS-SYNC] Failed to record status history:`, err));
          }

          await prisma.matters.update({
            where: { id: item.id },
            data: item.data,
          });
        }
        
        updatedCount += chunk.length;
        console.log(`[MATTERS-SYNC] Updated batch: ${updatedCount}/${mattersToUpdate.length}`);
      }
    }

    const syncedCount = createdCount + updatedCount;

    console.log(
      `[MATTERS-SYNC] ✅ Sync complete: ${syncedCount} total, ${createdCount} created, ${updatedCount} updated`,
    );

    return {
      success: true,
      total: syncedCount,
      created: createdCount,
      updated: updatedCount,
    };
  } catch (error) {
    console.error("[MATTERS-SYNC] ❌ Sync failed:", error);
    throw error;
  }
}

// Helper: Load user map
async function loadUserMap(): Promise<Map<number, string>> {
  const teams = await prisma.teams.findMany({
    select: { docketwiseId: true, fullName: true, firstName: true, lastName: true, email: true },
  });

  const userMap = new Map<number, string>();
  for (const t of teams) {
    const name = t.fullName || `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.email;
    userMap.set(t.docketwiseId, name);
  }
  return userMap;
}

// Helper: Load client map
async function loadClientMap(): Promise<Map<number, string>> {
  const clients = await prisma.contacts.findMany({
    select: { docketwiseId: true, firstName: true, lastName: true, companyName: true },
  });

  const clientMap = new Map<number, string>();
  for (const c of clients) {
    const name =
      c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown Client";
    clientMap.set(c.docketwiseId, name);
  }
  return clientMap;
}

// Helper: Load matter type map
async function loadMatterTypeMap(): Promise<Map<number, string>> {
  const types = await prisma.matterTypes.findMany({
    select: { docketwiseId: true, name: true },
  });

  const typeMap = new Map<number, string>();
  for (const t of types) {
    typeMap.set(t.docketwiseId, t.name);
  }
  return typeMap;
}

// Helper: Load status map
async function loadStatusMap(): Promise<Map<number, string>> {
  const statuses = await prisma.matterStatuses.findMany({
    select: { docketwiseId: true, name: true },
  });

  const statusMap = new Map<number, string>();
  for (const s of statuses) {
    statusMap.set(s.docketwiseId, s.name);
  }
  return statusMap;
}

// Helper: Resolve assignees from attorney_id
function resolveAssignees(
  matter: DocketwiseMatter,
  userMap: Map<number, string>,
): string | null {
  // Use attorney_id from list endpoint (primary attorney)
  if (matter.attorney_id) {
    const name = userMap.get(matter.attorney_id);
    if (name) return name;
  }
  
  return null;
}

// Helper: Resolve client name
function resolveClientName(
  matter: DocketwiseMatter,
  clientMap: Map<number, string>,
): string | null {
  if (matter.client_id) {
    const mapped = clientMap.get(matter.client_id);
    if (mapped) return mapped;
  }

  if (matter.client) {
    const name =
      matter.client.company_name ||
      `${matter.client.first_name || ""} ${matter.client.last_name || ""}`.trim();
    if (name) return name;
  }

  return null;
}
