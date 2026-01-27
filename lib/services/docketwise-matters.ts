import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import "server-only";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;
// const RATE_LIMIT_DELAY_MS = 600;
const MAX_RETRIES = 3;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch with retry
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
          `[MATTERS-FETCH] Rate limited, waiting ${backoffMs}ms before retry ${attempt + 1}/${retries}`,
        );
        await delay(backoffMs);
        continue;
      }
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

// Docketwise Matter API type
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
  discarded_at?: string | null;
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
  priority_date?: string | null;
  notes?: Array<{
    id: number;
    title: string | null;
    content: string;
    created_at: string;
    updated_at: string;
    created_by_name?: string | null;
  }> | null;
}

interface DocketwisePagination {
  total: number;
  next_page: number | null;
  previous_page: number | null;
  total_pages: number;
}

interface FetchMattersOptions {
  page?: number;
  perPage?: number;
  userId: string;
}

interface MappedMatter {
  id: string;
  docketwiseId: number;
  title: string;
  description: string | null;
  clientName: string | null;
  clientId: number | null;
  assignees: string | null;
  docketwiseUserIds: string;
  matterType: string | null;
  matterTypeId: number | null;
  status: string | null;
  statusId: number | null;
  statusForFiling: string | null;
  statusForFilingId: number | null;
  assignedDate: Date | null;
  estimatedDeadline: Date | null;
  actualDeadline: Date | null;
  billingStatus: "PAID" | "DEPOSIT_PAID" | "PAYMENT_PLAN" | "DUE" | null;
  totalHours: number | null;
  customNotes: string | null;
  lastSyncedAt: Date;
  isStale: boolean;
  docketwiseCreatedAt: Date | null;
  docketwiseUpdatedAt: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  archived: boolean;
  priorityDate: Date | null;
  isEdited: boolean;
  editedBy: string | null;
  editedAt: Date | null;
  editedByUser: { name: string; email: string; } | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: Array<{
    id: number;
    title: string | null;
    content: string;
    created_at: string;
    updated_at: string;
    created_by_name?: string | null;
  }> | null;
}

/**
 * Load cached reference maps from Redis
 * These are populated by syncReferenceData() every 12-24 hours
 */
async function loadReferenceMaps() {
  const redis = getRedis();

  try {
    const [userMapStr, clientMapStr, typeMapStr, statusMapStr] = await Promise.all([
      redis.get("docketwise:user-map"),
      redis.get("docketwise:client-map"),
      redis.get("docketwise:type-map"),
      redis.get("docketwise:status-map"),
    ]);

    const userMap = new Map<number, string>(
      Object.entries(JSON.parse(userMapStr || "{}")).map(([k, v]) => [
        parseInt(k),
        v as string,
      ])
    );

    const clientMap = new Map<number, string>(
      Object.entries(JSON.parse(clientMapStr || "{}")).map(([k, v]) => [
        parseInt(k),
        v as string,
      ])
    );

    const typeMap = new Map<number, string>(
      Object.entries(JSON.parse(typeMapStr || "{}")).map(([k, v]) => [
        parseInt(k),
        v as string,
      ])
    );

    const statusMap = new Map<number, string>(
      Object.entries(JSON.parse(statusMapStr || "{}")).map(([k, v]) => [
        parseInt(k),
        v as string,
      ])
    );

    return { userMap, clientMap, typeMap, statusMap };
  } catch (error) {
    console.warn("[MATTERS-FETCH] Failed to load reference maps from Redis:", error);
    // Fallback: load from database
    return loadReferenceMapsFromDB();
  }
}

/**
 * Fallback: Load reference maps from database if Redis is unavailable
 */
async function loadReferenceMapsFromDB() {
  const [users, contacts, types, statuses] = await Promise.all([
    prisma.docketwiseUsers.findMany({
      select: { docketwiseId: true, fullName: true },
    }),
    prisma.contacts.findMany({
      select: { docketwiseId: true, companyName: true, firstName: true, lastName: true },
    }),
    prisma.matterTypes.findMany({
      select: { docketwiseId: true, name: true },
    }),
    prisma.matterStatuses.findMany({
      select: { docketwiseId: true, name: true },
    }),
  ]);

  const userMap = new Map<number, string>(
    users.map((u) => [u.docketwiseId, u.fullName || "Unknown User"])
  );
  const clientMap = new Map<number, string>(
    contacts.map((c) => [
      c.docketwiseId,
      (c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown") as string,
    ])
  );
  const typeMap = new Map(types.map((t) => [t.docketwiseId, t.name]));
  const statusMap = new Map(statuses.map((s) => [s.docketwiseId, s.name]));

  return { userMap, clientMap, typeMap, statusMap };
}

/**
 * Resolve assignees from user_ids and attorney_id
 */
function resolveAssignees(matter: DocketwiseMatter, userMap: Map<number, string>): {
  assigneesStr: string | null;
  userIds: number[];
} {
  const userIds = (matter.user_ids || [])
    .map((id) => Number(id))
    .filter((id) => !isNaN(id));
  
  const attorneyId = matter.attorney_id ? Number(matter.attorney_id) : null;
  
  const allIds = [...new Set([...userIds, ...(attorneyId ? [attorneyId] : [])])];
  
  const names = allIds.map((id) => userMap.get(id)).filter(Boolean) as string[];
  
  return {
    assigneesStr: names.length > 0 ? names.join(", ") : null,
    userIds: allIds,
  };
}

/**
 * Resolve client name from client object or client_id
 */
function resolveClientName(
  matter: DocketwiseMatter,
  clientMap: Map<number, string>
): string | null {
  // Prefer embedded client object
  if (matter.client) {
    const name =
      matter.client.company_name ||
      `${matter.client.first_name || ""} ${matter.client.last_name || ""}`.trim();
    if (name) return name;
  }

  // Fallback to client_id lookup
  if (matter.client_id) {
    return clientMap.get(matter.client_id) || null;
  }

  return null;
}

/**
 * Resolve matter type name
 */
function resolveMatterType(
  matter: DocketwiseMatter,
  typeMap: Map<number, string>
): { name: string | null; id: number | null } {
  // Prefer object from detail view
  if (matter.matter_type) {
    return { name: matter.matter_type.name, id: matter.matter_type.id };
  }

  // Fallback to type string field or ID lookup
  if (matter.type) {
    return { name: matter.type, id: matter.matter_type_id || null };
  }

  if (matter.matter_type_id) {
    return {
      name: typeMap.get(matter.matter_type_id) || null,
      id: matter.matter_type_id,
    };
  }

  return { name: null, id: null };
}

/**
 * Resolve status/workflow stage name
 */
function resolveStatus(
  matter: DocketwiseMatter,
  statusMap: Map<number, string>
): string | null {
  // Prefer workflow_stage object
  if (matter.workflow_stage?.name) {
    return matter.workflow_stage.name;
  }

  // Try ID lookup
  const stageId = matter.workflow_stage_id || matter.matter_status_id;
  if (stageId) {
    return statusMap.get(stageId) || null;
  }

  // Fallback to status field
  if (typeof matter.status === "object" && matter.status?.name) {
    return matter.status.name;
  }

  if (typeof matter.status === "string") {
    return matter.status;
  }

  return null;
}

/**
 * Fetch matters from Docketwise API with real-time pagination
 * Maps IDs to names using cached reference data
 */
export async function fetchMattersRealtime(
  options: FetchMattersOptions
): Promise<{ data: MappedMatter[]; total: number; page: number; perPage: number }> {
  const { page = 1, perPage = 100, userId } = options;

  console.log(`[MATTERS-FETCH] Fetching page ${page} for user ${userId}`);

  try {
    // 1. Get Docketwise token
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    // 2. Load reference maps (from Redis or DB fallback)
    const { userMap, clientMap, typeMap, statusMap } = await loadReferenceMaps();
    console.log(
      `[MATTERS-FETCH] Loaded maps: ${userMap.size} users, ${clientMap.size} clients, ${typeMap.size} types, ${statusMap.size} statuses`
    );

    // 3. Fetch matters from Docketwise API
    const response = await fetchWithRetry(
      `${DOCKETWISE_API_URL}/matters?page=${page}&per_page=${Math.min(perPage, 200)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Docketwise API error: ${response.status}`);
    }

    const matters = (await response.json()) as DocketwiseMatter[];

    // Parse pagination
    let total = matters.length;
    const paginationHeader = response.headers.get("X-Pagination");
    if (paginationHeader) {
      try {
        const pagination = JSON.parse(paginationHeader) as DocketwisePagination;
        total = pagination.total;
      } catch {
        console.warn("[MATTERS-FETCH] Failed to parse pagination header");
      }
    }

    // 4. Get edited matters from local DB with editedByUser relation
    const matterIds = matters.map((m) => m.id);
    const editedMatters = await prisma.matters.findMany({
      where: {
        docketwiseId: { in: matterIds },
        userId,
      },
      include: {
        editedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    const editedMap = new Map(editedMatters.map((m) => [m.docketwiseId, m]));

    // 5. Sort matters by updated_at DESC (most recent first)
    const sortedMatters = matters.sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    // 6. Map matters with reference data resolution
    const mappedMatters: MappedMatter[] = sortedMatters.map((matter) => {
      const edited = editedMap.get(matter.id);

      // Resolve IDs to names
      const { assigneesStr, userIds } = resolveAssignees(matter, userMap);
      const clientName = resolveClientName(matter, clientMap);
      const { name: matterTypeName, id: matterTypeId } = resolveMatterType(matter, typeMap);
      const statusName = resolveStatus(matter, statusMap);

      // Status for filing (different from workflow stage)
      const statusForFiling =
        typeof matter.status === "object"
          ? matter.status?.name || null
          : typeof matter.status === "string"
            ? matter.status
            : null;

      // Parse dates
      const docketwiseCreatedAt = matter.created_at ? new Date(matter.created_at) : null;
      const docketwiseUpdatedAt = matter.updated_at ? new Date(matter.updated_at) : null;
      const openedAt = matter.opened_at ? new Date(matter.opened_at) : null;
      const closedAt = matter.closed_at ? new Date(matter.closed_at) : null;
      const priorityDate = matter.priority_date ? new Date(matter.priority_date) : null;

      // Use edited data if available, otherwise use mapped data
      const now = new Date();
      return {
        id: edited?.id || `dw-${matter.id}`,
        docketwiseId: matter.id,
        title: edited?.title || matter.title,
        description: edited?.description || matter.description || null,
        clientName: edited?.clientName || clientName,
        clientId: edited?.clientId || matter.client_id || null,
        assignees: edited?.assignees || assigneesStr,
        docketwiseUserIds: JSON.stringify(userIds),
        matterType: edited?.matterType || matterTypeName,
        matterTypeId: matterTypeId,
        status: edited?.status || statusName,
        statusId: edited?.statusId || matter.workflow_stage_id || matter.matter_status_id || null,
        statusForFiling: edited?.statusForFiling || statusForFiling,
        statusForFilingId: edited?.statusForFilingId || (typeof matter.status === "object" && matter.status ? matter.status.id : null),
        assignedDate: edited?.assignedDate || null,
        estimatedDeadline: edited?.estimatedDeadline || null,
        actualDeadline: edited?.actualDeadline || null,
        billingStatus: edited?.billingStatus || null,
        totalHours: edited?.totalHours || null,
        customNotes: edited?.customNotes || null,
        lastSyncedAt: edited?.lastSyncedAt || now,
        isStale: edited?.isStale || false,
        docketwiseCreatedAt,
        docketwiseUpdatedAt,
        openedAt,
        closedAt,
        archived: matter.archived,
        priorityDate,
        isEdited: !!edited,
        editedBy: edited?.editedBy || null,
        editedAt: edited?.editedAt || null,
        editedByUser: edited?.editedByUser ? {
          name: edited.editedByUser.name || "",
          email: edited.editedByUser.email,
        } : null,
        userId,
        createdAt: edited?.createdAt || now,
        updatedAt: edited?.updatedAt || now,
      };
    });

    console.log(`[MATTERS-FETCH] Mapped ${mappedMatters.length} matters for page ${page}`);

    return {
      data: mappedMatters,
      total,
      page,
      perPage,
    };
  } catch (error) {
    console.error("[MATTERS-FETCH] Error fetching matters:", error);
    throw error;
  }
}

/**
 * Fetch a single matter detail (for editing or viewing)
 */
export async function fetchMatterDetail(docketwiseId: number, userId: string) {
  console.log(`[MATTERS-FETCH] Fetching detail for matter ${docketwiseId}`);

  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    // Load reference maps
    const { userMap, clientMap, typeMap, statusMap } = await loadReferenceMaps();

    // Fetch from Docketwise
    const response = await fetchWithRetry(
      `${DOCKETWISE_API_URL}/matters/${docketwiseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch matter detail: ${response.status}`);
    }

    const matter = (await response.json()) as DocketwiseMatter;

    // Check if edited locally with editedByUser relation
    const edited = await prisma.matters.findFirst({
      where: {
        docketwiseId: matter.id,
        userId,
      },
      include: {
        editedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Map the matter
    const { assigneesStr, userIds } = resolveAssignees(matter, userMap);
    const clientName = resolveClientName(matter, clientMap);
    const { name: matterTypeName, id: matterTypeId } = resolveMatterType(matter, typeMap);
    const statusName = resolveStatus(matter, statusMap);

    const now = new Date();
    const mapped: MappedMatter = {
      id: edited?.id || `dw-${matter.id}`,
      docketwiseId: matter.id,
      title: edited?.title || matter.title,
      description: edited?.description || matter.description || null,
      clientName: edited?.clientName || clientName,
      clientId: edited?.clientId || matter.client_id || null,
      assignees: edited?.assignees || assigneesStr,
      docketwiseUserIds: JSON.stringify(userIds),
      matterType: edited?.matterType || matterTypeName,
      matterTypeId: matterTypeId,
      status: edited?.status || statusName,
      statusId: edited?.statusId || matter.workflow_stage_id || matter.matter_status_id || null,
      statusForFiling: edited?.statusForFiling || (typeof matter.status === "string" ? matter.status : matter.status?.name || null),
      statusForFilingId: edited?.statusForFilingId || (typeof matter.status === "object" && matter.status ? matter.status.id : null),
      assignedDate: edited?.assignedDate || null,
      estimatedDeadline: edited?.estimatedDeadline || null,
      actualDeadline: edited?.actualDeadline || null,
      billingStatus: edited?.billingStatus || null,
      totalHours: edited?.totalHours || null,
      customNotes: edited?.customNotes || null,
      lastSyncedAt: edited?.lastSyncedAt || now,
      isStale: edited?.isStale || false,
      docketwiseCreatedAt: matter.created_at ? new Date(matter.created_at) : null,
      docketwiseUpdatedAt: matter.updated_at ? new Date(matter.updated_at) : null,
      openedAt: matter.opened_at ? new Date(matter.opened_at) : null,
      closedAt: matter.closed_at ? new Date(matter.closed_at) : null,
      archived: matter.archived,
      priorityDate: matter.priority_date ? new Date(matter.priority_date) : null,
      isEdited: !!edited,
      editedBy: edited?.editedBy || null,
      editedAt: edited?.editedAt || null,
      editedByUser: edited?.editedByUser ? {
        name: edited.editedByUser.name || "",
        email: edited.editedByUser.email,
      } : null,
      userId,
      createdAt: edited?.createdAt || now,
      updatedAt: edited?.updatedAt || now,
      notes: matter.notes || null,
    };

    return mapped;
} catch (error) {
  console.error("[MATTER-DETAIL] Error fetching matter:", error);
  throw error;
}
}
