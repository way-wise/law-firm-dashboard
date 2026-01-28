import { getDocketwiseToken } from "@/lib/docketwise";
import {
  detectNotificationType,
  hasConfiguredRecipients,
  sendNotification,
} from "@/lib/notifications/notification-service";
import prisma from "@/lib/prisma";
import { invalidateCache } from "@/lib/redis";
import "server-only";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Rate limiting helper - Docketwise allows 120 requests/minute = 2 req/sec
// We need to be conservative to avoid 419 errors
const RATE_LIMIT_DELAY_MS = 600; // 600ms between API calls (safe for 120/min limit)
const MAX_RETRIES = 3; // Retry on 419 errors
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff for 419 errors
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 419 || response.status === 429) {
      if (attempt < retries) {
        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[SYNC] Rate limited (${response.status}), waiting ${backoffMs}ms before retry ${attempt + 1}/${retries}`,
        );
        await delay(backoffMs);
        continue;
      }
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

// Fetch individual matter details (contains user_ids, description, workflow_stage)
async function fetchMatterDetails(
  token: string,
  matterId: number,
): Promise<DocketwiseMatter | null> {
  try {
    const response = await fetchWithRetry(
      `${DOCKETWISE_API_URL}/matters/${matterId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.warn(
        `[SYNC] Failed to fetch matter ${matterId} details: ${response.status}`,
      );
      return null;
    }

    return (await response.json()) as DocketwiseMatter;
  } catch (error) {
    console.error(`[SYNC] Error fetching matter ${matterId} details:`, error);
    return null;
  }
}

// Fetch matter details sequentially to strictly respect rate limits
async function fetchMatterDetailsBatch(
  token: string,
  matterIds: number[],
): Promise<Map<number, DocketwiseMatter>> {
  const results = new Map<number, DocketwiseMatter>();
  let completed = 0;

  for (const id of matterIds) {
    const detail = await fetchMatterDetails(token, id);
    if (detail) {
      results.set(id, detail);
    }
    completed++;

    // Log progress periodically
    if (completed % 5 === 0) {
      console.log(`[SYNC] Details progress: ${completed}/${matterIds.length}`);
    }

    // Strict rate limiting: wait after EACH request
    // 120 req/min = 2 req/sec = 500ms min interval. 
    // Using 600ms to be safe.
    await delay(RATE_LIMIT_DELAY_MS);
  }

  return results;
}

// Docketwise API Types (based on actual API response)
interface DocketwiseMatter {
  id: number;
  title: string;
  number?: string | null;
  description?: string | null;
  client_id: number | null;
  attorney_id: number | null; // Primary attorney (can be null)
  user_ids?: number[] | null; // Array of assigned user IDs (from detailed response)
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
  status: { id: number; name: string } | string | null; // This is "Status For Filing"
  status_id?: number | null; // Status ID if not embedded
  matter_type?: { id: number; name: string } | null; // This is "Type"
  matter_type_id?: number | null; // Matter type ID if not embedded
  workflow_stage?: { id: number; name: string } | null; // This is "Status" in Docketwise UI
  workflow_stage_id?: number | null; // Workflow stage ID if not embedded
  matter_status_id?: number | null; // Alternative field name for workflow stage
  client?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    company_name?: string | null;
  } | null;
}

interface DocketwiseContact {
  id: number;
  first_name: string | null;
  last_name: string | null;
  middle_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
  lead?: boolean;
  street_address?: string | null;
  apartment_number?: string | null;
  city?: string | null;
  state?: string | null;
  province?: string | null;
  zip_code?: string | null;
  country?: string | null;
}

// Matter status (workflow stage) from /matter_statuses endpoint
interface DocketwiseMatterStatus {
  id: number;
  name: string;
  duration: number | null;
  sort: number | null;
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

// Matter type from /matter_types endpoint
interface DocketwiseMatterType {
  id: number;
  name: string;
  category?: string;
}

// Sync matters from Docketwise
export async function syncMatters(userId: string) {
  console.log("[SYNC] Starting sync for user:", userId);

  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    // Check if any notification recipients are configured
    // Skip sending notifications if no one will receive them
    const recipients = await hasConfiguredRecipients();
    const shouldSendNotifications = recipients.email || recipients.inApp;
    console.log(
      `[SYNC] Notification recipients configured: email=${recipients.email}, inApp=${recipients.inApp}`,
    );

    console.log("[SYNC] Token obtained, fetching reference data...");

    // Fetch matter_statuses (workflow stages) first for resolution
    let matterStatusMap = new Map<number, string>();
    try {
      const statusesResponse = await fetch(
        `${DOCKETWISE_API_URL}/matter_statuses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (statusesResponse.ok) {
        const statuses =
          (await statusesResponse.json()) as DocketwiseMatterStatus[];
        matterStatusMap = new Map(statuses.map((s) => [s.id, s.name]));
        console.log(
          `[SYNC] Loaded ${matterStatusMap.size} matter statuses (workflow stages)`,
        );
      }
    } catch (err) {
      console.warn("[SYNC] Failed to fetch matter_statuses:", err);
    }

    // Fetch matter_types
    try {
      const typesResponse = await fetchWithRetry(
        `${DOCKETWISE_API_URL}/matter_types`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (typesResponse.ok) {
        const types = (await typesResponse.json()) as DocketwiseMatterType[];
        console.log(`[SYNC] Loaded ${types.length} matter types`);

        // Sync matter types to database
        for (const type of types) {
          await prisma.matterTypes.upsert({
            where: { docketwiseId: type.id },
            update: {
              name: type.name,
              lastSyncedAt: new Date(),
            },
            create: {
              docketwiseId: type.id,
              name: type.name,
              lastSyncedAt: new Date(),
            },
          });
        }
        console.log(`[SYNC] Saved matter types to database`);
      }
    } catch (err) {
      console.warn("[SYNC] Failed to fetch matter_types:", err);
    }

    // Fetch ALL pages of users for assignee resolution
    let userMap = new Map<number, string>();
    try {
      let userPage = 1;
      const MAX_USER_PAGES = 10;
      const allUsers: DocketwiseUser[] = [];

      while (userPage <= MAX_USER_PAGES) {
        // Add delay between user pages
        if (userPage > 1) {
          await delay(RATE_LIMIT_DELAY_MS);
        }

        let usersResponse: Response;
        try {
          usersResponse = await fetchWithRetry(
            `${DOCKETWISE_API_URL}/users?page=${userPage}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
        } catch {
          console.warn(
            `[SYNC] Failed to fetch users page ${userPage}, stopping user sync`,
          );
          break;
        }

        if (!usersResponse.ok) break;

        const pageUsers = (await usersResponse.json()) as DocketwiseUser[];
        if (pageUsers.length === 0) break;

        allUsers.push(...pageUsers);
        console.log(
          `[SYNC] Fetched users page ${userPage}: ${pageUsers.length} users`,
        );

        // Check pagination header
        const userPagination = usersResponse.headers.get("X-Pagination");
        if (userPagination) {
          try {
            const pag = JSON.parse(userPagination) as DocketwisePagination;
            if (!pag.next_page) break;
          } catch {
            if (pageUsers.length < 200) break;
          }
        } else if (pageUsers.length < 200) {
          break;
        }

        userPage++;
      }

      userMap = new Map(
        allUsers.map((u) => [
          u.id,
          u.attorney_profile
            ? `${u.attorney_profile.first_name || ""} ${u.attorney_profile.last_name || ""}`.trim() ||
            u.email
            : u.email,
        ]),
      );
      console.log(
        `[SYNC] Loaded ${userMap.size} total users for assignee resolution`,
      );

      // Save users to teams table for proper team management
      for (const user of allUsers) {
        const firstName = user.attorney_profile?.first_name || null;
        const lastName = user.attorney_profile?.last_name || null;
        const fullName =
          firstName || lastName
            ? `${firstName || ""} ${lastName || ""}`.trim()
            : null;

        // Determine team type based on email or name patterns
        // This is a simple heuristic - you might want to make this configurable
        let teamType = "inHouse";
        if (user.email.includes("@contractor") || user.email.includes("@external")) {
          teamType = "contractor";
        }

        await prisma.teams.upsert({
          where: { docketwiseId: user.id },
          update: {
            email: user.email,
            firstName,
            lastName,
            fullName: fullName || user.email,
            teamType,
            title: null, // Could be derived from user role if available
            isActive: true,
            lastSyncedAt: new Date(),
          },
          create: {
            docketwiseId: user.id,
            email: user.email,
            firstName,
            lastName,
            fullName: fullName || user.email,
            teamType,
            title: null,
            isActive: true,
            lastSyncedAt: new Date(),
          },
        });
      }
      console.log(
        `[SYNC] Saved ${allUsers.length} users to teams table`,
      );
    } catch (err) {
      console.warn("[SYNC] Failed to fetch users:", err);
    }

    // --- MOVE CONTACT SYNC HERE (BEFORE MATTERS) ---
    console.log(`[SYNC] Fetching all contacts...`);
    try {
      const allClients: DocketwiseContact[] = [];
      let contactPage = 1;
      const MAX_CONTACT_PAGES = 50; // Increased to ensure we get all contacts

      while (contactPage <= MAX_CONTACT_PAGES) {
        // Add delay between contact pages
        if (contactPage > 1) {
          await delay(RATE_LIMIT_DELAY_MS);
        }

        let clientsResponse: Response;
        try {
          clientsResponse = await fetchWithRetry(
            `${DOCKETWISE_API_URL}/contacts?page=${contactPage}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
        } catch {
          console.warn(
            `[SYNC] Failed to fetch contacts page ${contactPage}, stopping contact sync`,
          );
          break;
        }

        if (!clientsResponse.ok) break;

        const pageClients =
          (await clientsResponse.json()) as DocketwiseContact[];
        if (pageClients.length === 0) break;

        allClients.push(...pageClients);
        console.log(
          `[SYNC] Fetched contacts page ${contactPage}: ${pageClients.length} contacts`,
        );

        // Check pagination header
        const contactPagination = clientsResponse.headers.get("X-Pagination");
        if (contactPagination) {
          try {
            const pag = JSON.parse(contactPagination) as DocketwisePagination;
            if (!pag.next_page) break;
          } catch {
            // If no pagination header or parse fails, check if we got less than 200
            if (pageClients.length < 200) break;
          }
        } else if (pageClients.length < 200) {
          break;
        }

        contactPage++;
      }

      // Save contacts to database
      console.log(`[SYNC] Saving ${allClients.length} contacts to database...`);
      const CONTACT_BATCH_SIZE = 50;
      for (let i = 0; i < allClients.length; i += CONTACT_BATCH_SIZE) {
        const batch = allClients.slice(i, i + CONTACT_BATCH_SIZE);
        await prisma.$transaction(
          batch.map((contact) =>
            prisma.contacts.upsert({
              where: { docketwiseId: contact.id },
              update: {
                firstName: contact.first_name,
                lastName: contact.last_name,
                middleName: contact.middle_name,
                companyName: contact.company_name,
                email: contact.email,
                phone: contact.phone,
                type: contact.type,
                isLead: contact.lead || false,
                streetAddress: contact.street_address,
                apartmentNumber: contact.apartment_number,
                city: contact.city,
                state: contact.state,
                province: contact.province,
                zipCode: contact.zip_code,
                country: contact.country,
                lastSyncedAt: new Date(),
              },
              create: {
                docketwiseId: contact.id,
                firstName: contact.first_name,
                lastName: contact.last_name,
                middleName: contact.middle_name,
                companyName: contact.company_name,
                email: contact.email,
                phone: contact.phone,
                type: contact.type,
                isLead: contact.lead || false,
                streetAddress: contact.street_address,
                apartmentNumber: contact.apartment_number,
                city: contact.city,
                state: contact.state,
                province: contact.province,
                zipCode: contact.zip_code,
                country: contact.country,
                lastSyncedAt: new Date(),
              },
            }),
          ),
        );
      }
      console.log(`[SYNC] Contacts sync completed.`);
    } catch (err) {
      console.warn("[SYNC] Failed to sync contacts:", err);
    }
    // -----------------------------------------------

    // Build clientMap from local contacts table to resolve client names
    let clientMap = new Map<number, string>();
    try {
      const contacts = await prisma.contacts.findMany({
        select: {
          docketwiseId: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      });
      clientMap = new Map(
        contacts.map((c) => [
          c.docketwiseId,
          c.companyName?.trim() ||
          `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
          "Unknown Client",
        ]),
      );
      console.log(
        `[SYNC] Loaded ${clientMap.size} contacts for client name resolution`,
      );
    } catch (err) {
      console.warn(
        "[SYNC] Failed to load contacts for client resolution:",
        err,
      );
    }

    console.log("[SYNC] Fetching matters...");

    let page = 1;
    let recordsProcessed = 0;
    const recordsCreated = 0;
    const recordsUpdated = 0;
    const MAX_PAGES = 20; // Safety limit - 200 records/page = 4000 matters max

    while (page <= MAX_PAGES) {
      console.log(`[SYNC] Fetching page ${page}...`);

      // Add delay between pages to respect rate limits
      if (page > 1) {
        await delay(RATE_LIMIT_DELAY_MS);
      }

      const response = await fetchWithRetry(
        `${DOCKETWISE_API_URL}/matters?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

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

      const data = (await response.json()) as DocketwiseMatter[];
      const matters: DocketwiseMatter[] = Array.isArray(data) ? data : [];
      recordsProcessed += matters.length;

      console.log(
        `[SYNC] Page ${page}: ${matters.length} matters, pagination:`,
        pagination,
      );

      // Log first matter to see structure (only on first page)
      if (page === 1 && matters.length > 0) {
        console.log(
          "[SYNC] Sample matter from list:",
          JSON.stringify(matters[0], null, 2),
        );
      }

      // Get all docketwise IDs from this page
      const docketwiseIds = matters.map((m) => m.id);

      // Batch fetch existing matters to check update status
      const existingMatters = await prisma.matters.findMany({
        where: { docketwiseId: { in: docketwiseIds } },
        select: {
          id: true,
          docketwiseId: true,
          docketwiseUpdatedAt: true,
          isEdited: true,
          status: true,
          statusForFiling: true,
          title: true,
          clientName: true,
          matterType: true,
          assignees: true,
          estimatedDeadline: true,
        },
      });

      const existingMattersMap = new Map(
        existingMatters.map((m) => [m.docketwiseId, m]),
      );

      // Determine which matters need detailed fetching
      // We need details if:
      // 1. Matter is new (not in DB)
      // 2. Matter has been updated remotely (API updated_at > DB docketwiseUpdatedAt)
      // 3. Matter is missing critical fields that come from details (assignees, status)
      const idsToFetchDetails = matters.filter(m => {
        const existing = existingMattersMap.get(m.id);
        if (!existing) return true; // New matter

        // Check for updates
        if (m.updated_at && existing.docketwiseUpdatedAt) {
          const apiUpdate = new Date(m.updated_at).getTime();
          const dbUpdate = existing.docketwiseUpdatedAt.getTime();
          if (apiUpdate > dbUpdate) return true;
        }

        // Check for missing critical data (self-healing)
        if (
          !existing.assignees ||
          !existing.status ||
          !existing.matterType ||
          !existing.clientName
        )
          return true;

        return false;
      }).map(m => m.id);

      console.log(`[SYNC] Fetching details for ${idsToFetchDetails.length}/${matters.length} matters (new/updated/incomplete)...`);

      // Fetch detailed data only for identified matters
      const matterDetails = await fetchMatterDetailsBatch(token, idsToFetchDetails);
      console.log(`[SYNC] Got details for ${matterDetails.size} matters`);

      // Log first detail to see structure
      if (page === 1 && matterDetails.size > 0) {
        const firstDetail = matterDetails.values().next().value;
        console.log(
          "[SYNC] Sample matter detail:",
          JSON.stringify(firstDetail, null, 2),
        );
      }

      const editedMatterIds = new Set(
        existingMatters.filter((m) => m.isEdited).map((m) => m.docketwiseId),
      );

      const BATCH_SIZE = 50;
      const mattersToProcess = matters.filter(
        (m) => !editedMatterIds.has(m.id),
      );
      const editedMattersToUpdate = matters.filter((m) =>
        editedMatterIds.has(m.id),
      );

      if (editedMattersToUpdate.length > 0) {
        const editedIds = editedMattersToUpdate.map((m) => m.id);
        await prisma.matters.updateMany({
          where: { docketwiseId: { in: editedIds } },
          data: { lastSyncedAt: new Date() },
        });
      }

      for (let i = 0; i < mattersToProcess.length; i += BATCH_SIZE) {
        const batch = mattersToProcess.slice(i, i + BATCH_SIZE);

        await prisma.$transaction(
          async (tx) => {
            for (const listMatter of batch) {
              try {
                // Use detailed data if available
                const detailedMatter = matterDetails.get(listMatter.id);
                // Use detailed matter if available, otherwise use list matter
                // But merge list matter properties to ensure we have basics if detail is partial (unlikely)
                const docketwiseMatter = detailedMatter || listMatter;
                const hasDetailData = !!detailedMatter;

                const existingMatter = existingMattersMap.get(
                  docketwiseMatter.id,
                );
                const newStatus =
                  typeof docketwiseMatter.status === "object" &&
                    docketwiseMatter.status
                    ? docketwiseMatter.status.name
                    : docketwiseMatter.status;

                // Check for status for filing change (this triggers RFE/approval/denial notifications)
                // Only send notifications if recipients are configured AND value actually changed
                if (
                  shouldSendNotifications &&
                  existingMatter &&
                  existingMatter.statusForFiling !== newStatus &&
                  newStatus
                ) {
                  const notificationType = detectNotificationType(
                    existingMatter.statusForFiling,
                    newStatus,
                  );
                  if (notificationType) {
                    console.log(
                      `[SYNC] Status for filing change detected for matter ${docketwiseMatter.id}: ${existingMatter.statusForFiling} -> ${newStatus} (${notificationType})`,
                    );

                    sendNotification({
                      type: notificationType,
                      matterId: existingMatter.id,
                      matterTitle:
                        docketwiseMatter.title || existingMatter.title,
                      clientName: existingMatter.clientName,
                      matterType:
                        docketwiseMatter.matter_type?.name ||
                        existingMatter.matterType,
                      workflowStage:
                        docketwiseMatter.workflow_stage?.name ||
                        existingMatter.status,
                      status: newStatus,
                      oldStatus: existingMatter.statusForFiling,
                      paralegalName: existingMatter.assignees,
                      deadlineDate: existingMatter.estimatedDeadline,
                    }).catch((err) =>
                      console.error(`[SYNC] Failed to send notification:`, err),
                    );
                  }
                }

                // Assignee resolution: use user_ids array (from detailed response) or fall back to attorney_id
                // user_ids contains all assigned users, attorney_id is the primary attorney
                // Ensure IDs are numbers for proper Map lookup
                const userIds = (docketwiseMatter.user_ids || [])
                  .map((id) => Number(id))
                  .filter((id) => !isNaN(id));
                const attorneyId = docketwiseMatter.attorney_id
                  ? Number(docketwiseMatter.attorney_id)
                  : null;

                // Combine user_ids and attorney_id, removing duplicates
                const allAssigneeIds = [
                  ...new Set([
                    ...userIds,
                    ...(attorneyId && !isNaN(attorneyId) ? [attorneyId] : []),
                  ]),
                ];

                const userIdsStr =
                  allAssigneeIds.length > 0
                    ? JSON.stringify(allAssigneeIds)
                    : null;

                // Resolve assignee names from all IDs using userMap
                const assigneeNames = allAssigneeIds
                  .map((id) => userMap.get(id))
                  .filter((name): name is string => !!name);
                const assigneesStr =
                  assigneeNames.length > 0 ? assigneeNames.join(", ") : null;

                // Debug log for matters with assignee issues
                if (allAssigneeIds.length > 0 || !hasDetailData) {
                  console.log(
                    `[SYNC DEBUG] Matter ${docketwiseMatter.id} "${docketwiseMatter.title}":`,
                  );
                  console.log(`  - hasDetailData: ${hasDetailData}`);
                  console.log(
                    `  - user_ids from API:`,
                    docketwiseMatter.user_ids,
                  );
                  console.log(
                    `  - attorney_id from API:`,
                    docketwiseMatter.attorney_id,
                  );
                  console.log(`  - allAssigneeIds:`, allAssigneeIds);
                  console.log(`  - resolved names:`, assigneesStr);
                  if (allAssigneeIds.length > 0 && !assigneesStr) {
                    console.log(
                      `  - WARNING: IDs found but no names resolved!`,
                    );
                    console.log(
                      `  - userMap has these IDs:`,
                      allAssigneeIds.map((id) => ({
                        id,
                        inMap: userMap.has(id),
                      })),
                    );
                  }
                }

                // Resolve workflow stage name (this is the "Status" column in Docketwise)
                let workflowStageName =
                  docketwiseMatter.workflow_stage?.name || null;
                if (!workflowStageName) {
                  // Try to resolve from ID
                  const stageId =
                    docketwiseMatter.workflow_stage_id ||
                    docketwiseMatter.matter_status_id;
                  if (stageId && matterStatusMap.has(stageId)) {
                    workflowStageName = matterStatusMap.get(stageId) || null;
                  }
                }

                // Fallback: if workflow_stage is still null, use status (status_for_filing) as display status
                if (!workflowStageName) {
                  const statusForFiling =
                    typeof docketwiseMatter.status === "object" &&
                      docketwiseMatter.status
                      ? docketwiseMatter.status.name
                      : typeof docketwiseMatter.status === "string"
                        ? docketwiseMatter.status
                        : null;
                  if (statusForFiling) {
                    workflowStageName = statusForFiling;
                  }
                }

                // Resolve client name: first try embedded client, then fallback to clientMap
                let resolvedClientName: string | null = null;
                if (docketwiseMatter.client) {
                  // Extract from embedded client object
                  resolvedClientName =
                    docketwiseMatter.client.company_name?.trim() ||
                    `${docketwiseMatter.client.first_name || ""} ${docketwiseMatter.client.last_name || ""}`.trim() ||
                    null;
                }
                // Fallback: resolve from clientMap using client_id
                if (
                  !resolvedClientName &&
                  docketwiseMatter.client_id &&
                  clientMap.has(docketwiseMatter.client_id)
                ) {
                  resolvedClientName =
                    clientMap.get(docketwiseMatter.client_id) || null;
                }

                // Check if resolution failed (we have IDs but no resolved names)
                const assigneesResolutionFailed = allAssigneeIds.length > 0 && !assigneesStr;

                // Check if specific data fields are missing from the source object (undefined keys)
                // This protects against partial API responses or schema changes
                const isUserIdsMissing = docketwiseMatter.user_ids === undefined;
                // Check both object and legacy string field
                const isMatterTypeMissing = docketwiseMatter.matter_type === undefined && docketwiseMatter.type === undefined;

                // Check if status resolution failed (we have an ID but no resolved name)
                const statusId = docketwiseMatter.workflow_stage?.id ||
                  docketwiseMatter.workflow_stage_id ||
                  docketwiseMatter.matter_status_id;
                const statusResolutionFailed = !!statusId && !workflowStageName;

                // IMPORTANT: When we don't have detail data, preserve existing values for fields that require details
                // This prevents overwriting good data with null when detail fetch fails due to rate limiting
                const shouldPreserveExisting = !hasDetailData && existingMatter;

                // Determine final values - preserve existing if:
                // 1. No detail data available (shouldPreserveExisting)
                // 2. We have detail data, but failed to resolve the name (ResolutionFailed)
                // 3. The source data is missing the field entirely (isMissing)
                const finalAssignees =
                  ((shouldPreserveExisting || assigneesResolutionFailed || isUserIdsMissing) && existingMatter?.assignees)
                    ? existingMatter.assignees
                    : assigneesStr;

                const finalStatus =
                  ((shouldPreserveExisting || statusResolutionFailed) && existingMatter?.status)
                    ? existingMatter.status
                    : workflowStageName;

                const finalMatterType =
                  ((shouldPreserveExisting || isMatterTypeMissing) && existingMatter?.matterType)
                    ? existingMatter.matterType
                    : docketwiseMatter.matter_type?.name ||
                    docketwiseMatter.type ||
                    null;

                await tx.matters.upsert({
                  where: { docketwiseId: docketwiseMatter.id },
                  update: {
                    docketwiseCreatedAt: docketwiseMatter.created_at
                      ? new Date(docketwiseMatter.created_at)
                      : null,
                    docketwiseUpdatedAt: docketwiseMatter.updated_at
                      ? new Date(docketwiseMatter.updated_at)
                      : null,
                    title: docketwiseMatter.title || "Untitled",
                    description: docketwiseMatter.description || null,
                    matterType: finalMatterType,
                    matterTypeId:
                      docketwiseMatter.matter_type?.id ||
                      docketwiseMatter.matter_type_id ||
                      null,
                    // status = workflow_stage (Docketwise "Status" column)
                    status: finalStatus,
                    statusId:
                      docketwiseMatter.workflow_stage?.id ||
                      docketwiseMatter.workflow_stage_id ||
                      docketwiseMatter.matter_status_id ||
                      null,
                    // statusForFiling = status (Docketwise "Status For Filing" column)
                    statusForFiling:
                      typeof docketwiseMatter.status === "object" &&
                        docketwiseMatter.status
                        ? docketwiseMatter.status.name
                        : typeof docketwiseMatter.status === "string"
                          ? docketwiseMatter.status
                          : null,
                    statusForFilingId:
                      typeof docketwiseMatter.status === "object" &&
                        docketwiseMatter.status
                        ? docketwiseMatter.status.id
                        : docketwiseMatter.status_id || null,
                    clientId: docketwiseMatter.client_id || null,
                    // Always update client name from resolved value
                    clientName: resolvedClientName,
                    openedAt: docketwiseMatter.opened_at
                      ? new Date(docketwiseMatter.opened_at)
                      : null,
                    closedAt: docketwiseMatter.closed_at
                      ? new Date(docketwiseMatter.closed_at)
                      : null,
                    archived: docketwiseMatter.archived || false,
                    discardedAt: docketwiseMatter.discarded_at
                      ? new Date(docketwiseMatter.discarded_at)
                      : null,
                    // Only update userIds if we have detail data
                    ...(hasDetailData ? { docketwiseUserIds: userIdsStr } : {}),
                    assignees: finalAssignees,
                    lastSyncedAt: new Date(),
                    isStale: false,
                  },
                  create: {
                    docketwiseId: docketwiseMatter.id,
                    docketwiseCreatedAt: docketwiseMatter.created_at
                      ? new Date(docketwiseMatter.created_at)
                      : null,
                    docketwiseUpdatedAt: docketwiseMatter.updated_at
                      ? new Date(docketwiseMatter.updated_at)
                      : null,
                    title: docketwiseMatter.title || "Untitled",
                    description: docketwiseMatter.description || null,
                    matterType:
                      docketwiseMatter.matter_type?.name ||
                      docketwiseMatter.type ||
                      null,
                    matterTypeId:
                      docketwiseMatter.matter_type?.id ||
                      docketwiseMatter.matter_type_id ||
                      null,
                    // status = workflow_stage (Docketwise "Status" column)
                    status: workflowStageName,
                    statusId:
                      docketwiseMatter.workflow_stage?.id ||
                      docketwiseMatter.workflow_stage_id ||
                      docketwiseMatter.matter_status_id ||
                      null,
                    // statusForFiling = status (Docketwise "Status For Filing" column)
                    statusForFiling:
                      typeof docketwiseMatter.status === "object" &&
                        docketwiseMatter.status
                        ? docketwiseMatter.status.name
                        : typeof docketwiseMatter.status === "string"
                          ? docketwiseMatter.status
                          : null,
                    statusForFilingId:
                      typeof docketwiseMatter.status === "object" &&
                        docketwiseMatter.status
                        ? docketwiseMatter.status.id
                        : docketwiseMatter.status_id || null,
                    clientId: docketwiseMatter.client_id || null,
                    clientName: resolvedClientName,
                    openedAt: docketwiseMatter.opened_at
                      ? new Date(docketwiseMatter.opened_at)
                      : null,
                    closedAt: docketwiseMatter.closed_at
                      ? new Date(docketwiseMatter.closed_at)
                      : null,
                    archived: docketwiseMatter.archived || false,
                    discardedAt: docketwiseMatter.discarded_at
                      ? new Date(docketwiseMatter.discarded_at)
                      : null,
                    docketwiseUserIds: userIdsStr,
                    assignees: assigneesStr,
                    userId,
                    lastSyncedAt: new Date(),
                    isStale: false,
                  },
                });
              } catch (error) {
                console.error(
                  `[SYNC] Error saving matter ${listMatter.id}:`,
                  error,
                );
              }
            }
          },
          { timeout: 60000 },
        );

        console.log(
          `[SYNC] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mattersToProcess.length / BATCH_SIZE)}`,
        );
      }

      if (page === 1) {
        // Redundant contact sync removed - already performed at start of sync
      }

      const hasNextPage = pagination
        ? pagination.next_page !== null && pagination.next_page !== undefined
        : matters.length >= 200; // Docketwise returns max 200 per page

      if (!hasNextPage || matters.length === 0) {
        console.log(
          `[SYNC] No more pages (hasNextPage=${hasNextPage}, matters=${matters.length}), stopping`,
        );
        break;
      }

      await delay(RATE_LIMIT_DELAY_MS);
      page++;
    }

    if (page > MAX_PAGES) {
      console.warn(`[SYNC] Reached max page limit of ${MAX_PAGES}`);
    }

    console.log(
      `[SYNC] Completed: ${recordsProcessed} total records processed`,
    );

    // Invalidate all dashboard cache for this user after sync
    await invalidateCache(`dashboard:*:${userId}`);
    await invalidateCache(`matters:*`);
    console.log(`[SYNC] Cache invalidated for user ${userId}`);

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
