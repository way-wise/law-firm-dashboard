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

// Rate limiting helper - Docketwise allows 120 requests/minute
// With detail fetching, we need to be more careful
const RATE_LIMIT_DELAY_MS = 50; // 50ms between API calls (allows ~20 req/sec, well under 120/min)
const DETAIL_BATCH_SIZE = 10; // Fetch details in parallel batches
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch individual matter details (contains user_ids, description, workflow_stage)
async function fetchMatterDetails(
  token: string,
  matterId: number,
): Promise<DocketwiseMatter | null> {
  try {
    const response = await fetch(`${DOCKETWISE_API_URL}/matters/${matterId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

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

// Fetch matter details in parallel batches
async function fetchMatterDetailsBatch(
  token: string,
  matterIds: number[],
): Promise<Map<number, DocketwiseMatter>> {
  const results = new Map<number, DocketwiseMatter>();

  for (let i = 0; i < matterIds.length; i += DETAIL_BATCH_SIZE) {
    const batch = matterIds.slice(i, i + DETAIL_BATCH_SIZE);
    const promises = batch.map((id) => fetchMatterDetails(token, id));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((detail, index) => {
      if (detail) {
        results.set(batch[index], detail);
      }
    });

    // Rate limit between batches
    if (i + DETAIL_BATCH_SIZE < matterIds.length) {
      await delay(RATE_LIMIT_DELAY_MS * 2);
    }
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

    // Fetch ALL pages of users for assignee resolution
    let userMap = new Map<number, string>();
    try {
      let userPage = 1;
      const MAX_USER_PAGES = 10;
      const allUsers: DocketwiseUser[] = [];

      while (userPage <= MAX_USER_PAGES) {
        const usersResponse = await fetch(
          `${DOCKETWISE_API_URL}/users?page=${userPage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

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
        await delay(RATE_LIMIT_DELAY_MS);
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

      // Save users to docketwiseUsers table for Assignee Overview
      for (const user of allUsers) {
        const firstName = user.attorney_profile?.first_name || null;
        const lastName = user.attorney_profile?.last_name || null;
        const fullName =
          firstName || lastName
            ? `${firstName || ""} ${lastName || ""}`.trim()
            : null;

        await prisma.docketwiseUsers.upsert({
          where: { docketwiseId: user.id },
          update: {
            email: user.email,
            firstName,
            lastName,
            fullName: fullName || user.email,
            isActive: true,
            lastSyncedAt: new Date(),
          },
          create: {
            docketwiseId: user.id,
            email: user.email,
            firstName,
            lastName,
            fullName: fullName || user.email,
            isActive: true,
            lastSyncedAt: new Date(),
          },
        });
      }
      console.log(
        `[SYNC] Saved ${allUsers.length} users to docketwiseUsers table`,
      );
    } catch (err) {
      console.warn("[SYNC] Failed to fetch users:", err);
    }

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
      console.log(`[SYNC] Loaded ${clientMap.size} contacts for client name resolution`);
    } catch (err) {
      console.warn("[SYNC] Failed to load contacts for client resolution:", err);
    }

    console.log("[SYNC] Fetching matters...");

    let page = 1;
    let recordsProcessed = 0;
    const recordsCreated = 0;
    const recordsUpdated = 0;
    const MAX_PAGES = 20; // Safety limit - 200 records/page = 4000 matters max

    while (page <= MAX_PAGES) {
      console.log(`[SYNC] Fetching page ${page}...`);

      const response = await fetch(
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

      // Fetch detailed data for each matter (contains user_ids, description, workflow_stage)
      console.log(`[SYNC] Fetching details for ${matters.length} matters...`);
      const matterIds = matters.map((m) => m.id);
      const matterDetails = await fetchMatterDetailsBatch(token, matterIds);
      console.log(`[SYNC] Got details for ${matterDetails.size} matters`);

      // Log first detail to see structure
      if (page === 1 && matterDetails.size > 0) {
        const firstDetail = matterDetails.values().next().value;
        console.log(
          "[SYNC] Sample matter detail:",
          JSON.stringify(firstDetail, null, 2),
        );
        console.log("[SYNC] Detail keys:", Object.keys(firstDetail || {}));
        console.log("[SYNC] attorney_id:", firstDetail?.attorney_id);
        console.log("[SYNC] userMap size:", userMap.size);
        console.log("[SYNC] userMap sample entries:", Array.from(userMap.entries()).slice(0, 5));
        console.log("[SYNC] workflow_stage:", firstDetail?.workflow_stage);
        console.log(
          "[SYNC] workflow_stage_id:",
          firstDetail?.workflow_stage_id,
        );
        console.log("[SYNC] matter_status_id:", firstDetail?.matter_status_id);
        console.log("[SYNC] matter_type:", firstDetail?.matter_type);
        console.log("[SYNC] status:", firstDetail?.status);
      }

      // Get all docketwise IDs from this page
      const docketwiseIds = matters.map((m) => m.id);

      // Batch fetch existing matters to check isEdited status and current status for change detection
      const existingMatters = await prisma.matters.findMany({
        where: { docketwiseId: { in: docketwiseIds } },
        select: {
          id: true,
          docketwiseId: true,
          isEdited: true,
          status: true, // Workflow stage (renamed)
          statusForFiling: true, // Status for filing (renamed)
          title: true,
          clientName: true,
          matterType: true,
          assignees: true, // Assignees (renamed from paralegalAssigned)
          estimatedDeadline: true,
        },
      });
      const existingMattersMap = new Map(
        existingMatters.map((m) => [m.docketwiseId, m]),
      );
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
                // Use detailed data if available, fallback to list data
                const docketwiseMatter =
                  matterDetails.get(listMatter.id) || listMatter;

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
                const userIds = docketwiseMatter.user_ids || [];
                const attorneyId = docketwiseMatter.attorney_id;
                
                // Combine user_ids and attorney_id, removing duplicates
                const allAssigneeIds = [...new Set([
                  ...userIds,
                  ...(attorneyId ? [attorneyId] : [])
                ])];
                
                const userIdsStr = allAssigneeIds.length > 0 ? JSON.stringify(allAssigneeIds) : null;
                
                // Resolve assignee names from all IDs using userMap
                const assigneeNames = allAssigneeIds
                  .map(id => userMap.get(id))
                  .filter((name): name is string => !!name);
                const assigneesStr = assigneeNames.length > 0 ? assigneeNames.join(", ") : null;
                
                // Debug log for first 5 matters
                if (page === 1 && i === 0 && batch.indexOf(listMatter) < 5) {
                  console.log(`[SYNC DEBUG] Matter ${docketwiseMatter.id} "${docketwiseMatter.title}":`);
                  console.log(`  - user_ids:`, userIds);
                  console.log(`  - attorney_id:`, attorneyId);
                  console.log(`  - allAssigneeIds:`, allAssigneeIds);
                  console.log(`  - resolved names:`, assigneesStr);
                  console.log(`  - userMap size:`, userMap.size);
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
                if (!resolvedClientName && docketwiseMatter.client_id && clientMap.has(docketwiseMatter.client_id)) {
                  resolvedClientName = clientMap.get(docketwiseMatter.client_id) || null;
                }

                await tx.matters.upsert({
                  where: { docketwiseId: docketwiseMatter.id },
                  update: {
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
                    // Always update client name from resolved value
                    clientName: resolvedClientName,
                    openedAt: docketwiseMatter.opened_at
                      ? new Date(docketwiseMatter.opened_at)
                      : null,
                    closedAt: docketwiseMatter.closed_at
                      ? new Date(docketwiseMatter.closed_at)
                      : null,
                    docketwiseUserIds: userIdsStr,
                    assignees: assigneesStr,
                    lastSyncedAt: new Date(),
                    isStale: false,
                  },
                  create: {
                    docketwiseId: docketwiseMatter.id,
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
        const clientIds = [
          ...new Set(
            matters.filter((m) => m.client_id).map((m) => m.client_id),
          ),
        ];
        if (clientIds.length > 0) {
          console.log(`[SYNC] Fetching all clients (with pagination)...`);
          try {
            // Fetch all pages of contacts
            const allClients: DocketwiseContact[] = [];
            let contactPage = 1;
            const MAX_CONTACT_PAGES = 10;

            while (contactPage <= MAX_CONTACT_PAGES) {
              const clientsResponse = await fetch(
                `${DOCKETWISE_API_URL}/contacts?page=${contactPage}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );

              if (!clientsResponse.ok) break;

              const pageClients =
                (await clientsResponse.json()) as DocketwiseContact[];
              if (pageClients.length === 0) break;

              allClients.push(...pageClients);
              console.log(
                `[SYNC] Fetched contacts page ${contactPage}: ${pageClients.length} contacts`,
              );

              // Check pagination header
              const contactPagination =
                clientsResponse.headers.get("X-Pagination");
              if (contactPagination) {
                try {
                  const pag = JSON.parse(
                    contactPagination,
                  ) as DocketwisePagination;
                  if (!pag.next_page) break;
                } catch {
                  // If no pagination header or parse fails, check if we got less than 200
                  if (pageClients.length < 200) break;
                }
              } else if (pageClients.length < 200) {
                break;
              }

              await delay(RATE_LIMIT_DELAY_MS);
              contactPage++;
            }

            console.log(`[SYNC] Total contacts fetched: ${allClients.length}`);

            // Save contacts to database
            if (allClients.length > 0) {
              let contactsSaved = 0;
              for (const contact of allClients) {
                await prisma.contacts.upsert({
                  where: { docketwiseId: contact.id },
                  update: {
                    firstName: contact.first_name || null,
                    lastName: contact.last_name || null,
                    middleName: contact.middle_name || null,
                    companyName: contact.company_name || null,
                    email: contact.email || null,
                    phone: contact.phone || null,
                    type: contact.type || null,
                    isLead: contact.lead ?? false,
                    streetAddress: contact.street_address || null,
                    apartmentNumber: contact.apartment_number || null,
                    city: contact.city || null,
                    state: contact.state || null,
                    province: contact.province || null,
                    zipCode: contact.zip_code || null,
                    country: contact.country || null,
                    lastSyncedAt: new Date(),
                  },
                  create: {
                    docketwiseId: contact.id,
                    firstName: contact.first_name || null,
                    lastName: contact.last_name || null,
                    middleName: contact.middle_name || null,
                    companyName: contact.company_name || null,
                    email: contact.email || null,
                    phone: contact.phone || null,
                    type: contact.type || null,
                    isLead: contact.lead ?? false,
                    streetAddress: contact.street_address || null,
                    apartmentNumber: contact.apartment_number || null,
                    city: contact.city || null,
                    state: contact.state || null,
                    province: contact.province || null,
                    zipCode: contact.zip_code || null,
                    country: contact.country || null,
                    lastSyncedAt: new Date(),
                  },
                });
                contactsSaved++;
              }
              console.log(`[SYNC] Saved ${contactsSaved} contacts to database`);

              const clientMap = new Map<number, string | null>(
                allClients.map((c) => [
                  c.id,
                  // For Institution contacts, use company_name; for Person contacts, use first/last name
                  c.company_name?.trim() ||
                    `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
                    null,
                ]),
              );

              const mattersToUpdate = await prisma.matters.findMany({
                where: {
                  userId,
                  clientId: { not: null },
                  isEdited: false,
                },
                select: { id: true, clientId: true },
              });

              const mattersByClient = new Map<number, string[]>();
              for (const matter of mattersToUpdate) {
                if (matter.clientId && clientMap.has(matter.clientId)) {
                  if (!mattersByClient.has(matter.clientId)) {
                    mattersByClient.set(matter.clientId, []);
                  }
                  mattersByClient.get(matter.clientId)!.push(matter.id);
                }
              }

              let updatedCount = 0;
              for (const [clientId, matterIds] of mattersByClient) {
                const clientName = clientMap.get(clientId);
                if (clientName) {
                  await prisma.matters.updateMany({
                    where: { id: { in: matterIds } },
                    data: { clientName },
                  });
                  updatedCount += matterIds.length;
                }
              }
              console.log(
                `[SYNC] Updated client names for ${updatedCount} matters`,
              );
            }
          } catch (clientError) {
            console.error(`[SYNC] Error fetching clients:`, clientError);
          }
        }
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
