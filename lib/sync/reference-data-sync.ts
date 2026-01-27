import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import "server-only";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Rate limiting - Docketwise allows 120 requests/minute
const RATE_LIMIT_DELAY_MS = 600;
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
          `[REFERENCE-SYNC] Rate limited (${response.status}), waiting ${backoffMs}ms before retry ${attempt + 1}/${retries}`,
        );
        await delay(backoffMs);
        continue;
      }
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

// API Types
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

interface DocketwiseMatterStatus {
  id: number;
  name: string;
  duration: number | null;
  sort: number | null;
  created_at?: string;
  updated_at?: string;
  firm_id?: number;
  task_list_id?: number | null;
  message_template_id?: number | null;
  move_to_next_status?: boolean;
  cc_message_to_matter_applicant?: boolean;
}

interface DocketwiseMatterType {
  id: number;
  name: string;
  category?: string;
  matter_statuses?: DocketwiseMatterStatus[];
  created_at?: string;
  updated_at?: string;
  firm_id?: number;
}

interface DocketwisePagination {
  total: number;
  next_page: number | null;
  previous_page: number | null;
  total_pages: number;
}

/**
 * Sync only reference data from Docketwise:
 * - Users (for assignee resolution)
 * - Contacts (for client name resolution)
 * - Matter Types (for matter type resolution)
 * - Matter Statuses (for status resolution)
 * 
 * This replaces the full matter sync and takes only 2-5 minutes instead of 60 minutes.
 * Matter data will be fetched real-time with pagination when needed.
 */
export async function syncReferenceData(userId: string) {
  console.log("[REFERENCE-SYNC] Starting reference data sync for user:", userId);

  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    let totalRecordsProcessed = 0;

    // 1. SYNC MATTER STATUSES (WORKFLOW STAGES)
    console.log("[REFERENCE-SYNC] Fetching matter statuses...");
    try {
      const statusesResponse = await fetchWithRetry(
        `${DOCKETWISE_API_URL}/matter_statuses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (statusesResponse.ok) {
        const statuses = (await statusesResponse.json()) as DocketwiseMatterStatus[];
        console.log(`[REFERENCE-SYNC] Loaded ${statuses.length} matter statuses`);

        // Save to database
        for (const status of statuses) {
          await prisma.matterStatuses.upsert({
            where: { docketwiseId: status.id },
            update: {
              name: status.name,
              duration: status.duration,
              sort: status.sort,
              lastSyncedAt: new Date(),
            },
            create: {
              docketwiseId: status.id,
              name: status.name,
              duration: status.duration,
              sort: status.sort,
              lastSyncedAt: new Date(),
            },
          });
        }

        // Cache status map in Redis for real-time resolution (24h TTL)
        const statusMap = Object.fromEntries(
          statuses.map((s) => [s.id.toString(), s.name])
        );
        const redis = getRedis();
        await redis.setex(
          "docketwise:status-map",
          86400, // 24 hours
          JSON.stringify(statusMap)
        );

        totalRecordsProcessed += statuses.length;
        console.log(`[REFERENCE-SYNC] Saved ${statuses.length} matter statuses`);
      }
    } catch (err) {
      console.warn("[REFERENCE-SYNC] Failed to sync matter statuses:", err);
    }

    // 2. SYNC MATTER TYPES
    console.log("[REFERENCE-SYNC] Fetching matter types...");
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
        console.log(`[REFERENCE-SYNC] Loaded ${types.length} matter types`);

        // Save types and their statuses to database
        for (const type of types) {
          const savedType = await prisma.matterTypes.upsert({
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

          // Save statuses linked to this matter type
          if (type.matter_statuses && type.matter_statuses.length > 0) {
            console.log(`[REFERENCE-SYNC] Type "${type.name}" has ${type.matter_statuses.length} statuses`);
            for (const status of type.matter_statuses) {
              await prisma.matterStatuses.upsert({
                where: { docketwiseId: status.id },
                update: {
                  name: status.name,
                  duration: status.duration,
                  sort: status.sort,
                  matterTypeId: savedType.id,
                  lastSyncedAt: new Date(),
                },
                create: {
                  docketwiseId: status.id,
                  name: status.name,
                  duration: status.duration,
                  sort: status.sort,
                  matterTypeId: savedType.id,
                  lastSyncedAt: new Date(),
                },
              });
            }
            console.log(`[REFERENCE-SYNC] Synced ${type.matter_statuses.length} statuses for type "${type.name}"`);
          } else {
            console.log(`[REFERENCE-SYNC] Type "${type.name}" has NO statuses in API response`);
          }
        }

        // Cache type map in Redis (24h TTL)
        const typeMap = Object.fromEntries(
          types.map((t) => [t.id.toString(), t.name])
        );
        const redis = getRedis();
        await redis.setex(
          "docketwise:type-map",
          86400,
          JSON.stringify(typeMap)
        );

        totalRecordsProcessed += types.length;
        console.log(`[REFERENCE-SYNC] Saved ${types.length} matter types`);
      }
    } catch (err) {
      console.warn("[REFERENCE-SYNC] Failed to sync matter types:", err);
    }

    // 3. SYNC USERS (ALL PAGES)
    console.log("[REFERENCE-SYNC] Fetching users...");
    try {
      let userPage = 1;
      const MAX_USER_PAGES = 20;
      const allUsers: DocketwiseUser[] = [];

      while (userPage <= MAX_USER_PAGES) {
        if (userPage > 1) {
          await delay(RATE_LIMIT_DELAY_MS);
        }

        const usersResponse = await fetchWithRetry(
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
          `[REFERENCE-SYNC] Fetched users page ${userPage}: ${pageUsers.length} users`,
        );

        // Check pagination
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

      console.log(`[REFERENCE-SYNC] Loaded ${allUsers.length} total users`);

      // Save to database
      for (const user of allUsers) {
        const firstName = user.attorney_profile?.first_name || null;
        const lastName = user.attorney_profile?.last_name || null;
        const fullName =
          firstName || lastName
            ? `${firstName || ""} ${lastName || ""}`.trim()
            : null;

        // Determine team type based on email patterns
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
            title: null,
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

      // Cache user map in Redis (24h TTL)
      const userMap = Object.fromEntries(
        allUsers.map((u) => [
          u.id.toString(),
          u.attorney_profile
            ? `${u.attorney_profile.first_name || ""} ${u.attorney_profile.last_name || ""}`.trim() ||
              u.email
            : u.email,
        ])
      );
      const redis = getRedis();
      await redis.setex(
        "docketwise:user-map",
        86400,
        JSON.stringify(userMap)
      );

      totalRecordsProcessed += allUsers.length;
      console.log(`[REFERENCE-SYNC] Saved ${allUsers.length} team members`);
    } catch (err) {
      console.warn("[REFERENCE-SYNC] Failed to sync team members:", err);
    }

    // 4. SYNC CONTACTS (ALL PAGES)
    console.log("[REFERENCE-SYNC] Fetching contacts...");
    try {
      const allContacts: DocketwiseContact[] = [];
      let contactPage = 1;
      const MAX_CONTACT_PAGES = 50;

      while (contactPage <= MAX_CONTACT_PAGES) {
        if (contactPage > 1) {
          await delay(RATE_LIMIT_DELAY_MS);
        }

        const contactsResponse = await fetchWithRetry(
          `${DOCKETWISE_API_URL}/contacts?page=${contactPage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!contactsResponse.ok) break;

        const pageContacts = (await contactsResponse.json()) as DocketwiseContact[];
        if (pageContacts.length === 0) break;

        allContacts.push(...pageContacts);
        console.log(
          `[REFERENCE-SYNC] Fetched contacts page ${contactPage}: ${pageContacts.length} contacts`,
        );

        // Check pagination
        const contactPagination = contactsResponse.headers.get("X-Pagination");
        if (contactPagination) {
          try {
            const pag = JSON.parse(contactPagination) as DocketwisePagination;
            if (!pag.next_page) break;
          } catch {
            if (pageContacts.length < 200) break;
          }
        } else if (pageContacts.length < 200) {
          break;
        }

        contactPage++;
      }

      console.log(`[REFERENCE-SYNC] Loaded ${allContacts.length} total contacts`);

      // Save to database in batches with increased timeout
      const CONTACT_BATCH_SIZE = 50;
      for (let i = 0; i < allContacts.length; i += CONTACT_BATCH_SIZE) {
        const batch = allContacts.slice(i, i + CONTACT_BATCH_SIZE);
        await prisma.$transaction(
          async (tx) => {
            const promises = batch.map((contact) =>
              tx.contacts.upsert({
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
              })
            );
            await Promise.all(promises);
          },
          { timeout: 30000 }
        );
      }

      // Cache contact/client map in Redis (24h TTL)
      const clientMap = Object.fromEntries(
        allContacts.map((c) => [
          c.id.toString(),
          c.company_name?.trim() ||
            `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
            "Unknown Client",
        ])
      );
      const redis = getRedis();
      await redis.setex(
        "docketwise:client-map",
        86400,
        JSON.stringify(clientMap)
      );

      totalRecordsProcessed += allContacts.length;
      console.log(`[REFERENCE-SYNC] Saved ${allContacts.length} contacts`);
    } catch (err) {
      console.warn("[REFERENCE-SYNC] Failed to sync contacts:", err);
    }

    console.log(
      `[REFERENCE-SYNC] Reference data sync completed. Total records: ${totalRecordsProcessed}`,
    );

    return {
      success: true,
      recordsProcessed: totalRecordsProcessed,
      recordsCreated: 0,
      recordsUpdated: 0,
    };
  } catch (error) {
    console.error("[REFERENCE-SYNC] Sync failed:", error);
    throw error;
  }
}
