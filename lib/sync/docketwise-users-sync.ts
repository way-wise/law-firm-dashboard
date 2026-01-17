import "server-only";
import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Docketwise user response structure
interface DocketwiseUserResponse {
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

/**
 * Sync users from Docketwise API to local database
 * This replaces the need for hardcoded workers data
 */
export async function syncDocketwiseUsers() {
  console.log("[SYNC-USERS] Starting Docketwise users sync...");

  try {
    const token = await getDocketwiseToken();
    if (!token) {
      throw new Error("No Docketwise token available");
    }

    const response = await fetch(`${DOCKETWISE_API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYNC-USERS] API error ${response.status}:`, errorText);
      throw new Error(`Docketwise API error: ${response.status}`);
    }

    const users = (await response.json()) as DocketwiseUserResponse[];
    console.log(`[SYNC-USERS] Fetched ${users.length} users from Docketwise`);

    let created = 0;
    let updated = 0;

    for (const user of users) {
      const firstName = user.attorney_profile?.first_name || null;
      const lastName = user.attorney_profile?.last_name || null;
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

      await prisma.docketwiseUsers.upsert({
        where: { docketwiseId: user.id },
        update: {
          email: user.email,
          firstName,
          lastName,
          fullName,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        create: {
          docketwiseId: user.id,
          email: user.email,
          firstName,
          lastName,
          fullName,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });

      const existing = await prisma.docketwiseUsers.findUnique({
        where: { docketwiseId: user.id },
      });
      if (existing?.createdAt.getTime() === existing?.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }

    console.log(
      `[SYNC-USERS] Completed: ${created} created, ${updated} updated`
    );

    return {
      success: true,
      total: users.length,
      created,
      updated,
    };
  } catch (error) {
    console.error("[SYNC-USERS] Error:", error);
    throw error;
  }
}

/**
 * Get all active Docketwise users from local database
 */
export async function getDocketwiseUsers() {
  return prisma.docketwiseUsers.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
  });
}

/**
 * Get a Docketwise user by their Docketwise ID
 */
export async function getDocketwiseUserById(docketwiseId: number) {
  return prisma.docketwiseUsers.findUnique({
    where: { docketwiseId },
  });
}
