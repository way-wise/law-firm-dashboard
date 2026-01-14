import "server-only";
import { getDocketwiseToken } from "@/lib/docketwise";
import prisma from "@/lib/prisma";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

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
    const MAX_PAGES = 50; // Safety limit to prevent infinite loops

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

      const data = await response.json();
      console.log(`[SYNC] Page ${page} response:`, {
        hasData: !!data,
        isArray: Array.isArray(data),
        dataKeys: Object.keys(data || {}),
        pagination: data.pagination,
      });

      const matters = Array.isArray(data) ? data : data.data || [];
      recordsProcessed += matters.length;
      
      console.log(`[SYNC] Processed ${matters.length} matters from page ${page}`);
      
      // Log first matter to see structure
      if (matters.length > 0) {
        console.log("[SYNC] Sample matter structure:", JSON.stringify(matters[0], null, 2));
      }

      // First, save all matters without client names
      for (const docketwiseMatter of matters) {
        try {
          // Check if matter exists and is edited
          const existingMatter = await prisma.matters.findUnique({
            where: { docketwiseId: docketwiseMatter.id },
            select: { isEdited: true },
          });

          // Skip update if user has edited this matter
          if (existingMatter?.isEdited) {
            console.log(`Skipping matter ${docketwiseMatter.id} - user has edited it`);
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
              matterType: docketwiseMatter.matter_type?.name || null,
              matterTypeId: docketwiseMatter.matter_type?.id || null,
              workflowStage: docketwiseMatter.workflow_stage?.name || null,
              workflowStageId: docketwiseMatter.workflow_stage?.id || null,
              clientId: docketwiseMatter.client_id || null,
              status: docketwiseMatter.status?.name || null,
              statusId: docketwiseMatter.status?.id || null,
              openedAt: docketwiseMatter.opened_at ? new Date(docketwiseMatter.opened_at) : null,
              closedAt: docketwiseMatter.closed_at ? new Date(docketwiseMatter.closed_at) : null,
              lastSyncedAt: new Date(),
              isStale: false,
              // isEdited, editedBy, editedAt are NOT touched by sync
            },
            create: {
              docketwiseId: docketwiseMatter.id,
              docketwiseUpdatedAt: docketwiseMatter.updated_at ? new Date(docketwiseMatter.updated_at) : null,
              title: docketwiseMatter.title || "Untitled",
              matterType: docketwiseMatter.type || null,
              matterTypeId: null,
              workflowStage: docketwiseMatter.status || null,
              workflowStageId: null,
              clientId: docketwiseMatter.client_id || null,
              status: docketwiseMatter.status || null,
              statusId: null,
              openedAt: docketwiseMatter.created_at ? new Date(docketwiseMatter.created_at) : null,
              closedAt: docketwiseMatter.archived ? new Date(docketwiseMatter.updated_at) : null,
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
      const clientIds = [...new Set(matters.filter((m: any) => m.client_id).map((m: any) => m.client_id))];
      if (clientIds.length > 0 && page === 1) { // Only fetch clients on first page
        console.log(`[SYNC] Fetching all clients...`);
        try {
          const clientsResponse = await fetch(`${DOCKETWISE_API_URL}/contacts`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (clientsResponse.ok) {
            const allClients = await clientsResponse.json();
            const clientMap = new Map(
              allClients.map((c: any) => [
                c.id,
                `${c.first_name || ""} ${c.last_name || ""}`.trim() || null,
              ])
            );

            // Update all matters with client names
            const mattersToUpdate = await prisma.matters.findMany({
              where: { userId, clientId: { not: null } },
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

      // Check if there are more pages
      const hasNextPage = data.pagination?.next_page !== null && data.pagination?.next_page !== undefined;
      
      if (!hasNextPage || matters.length === 0) {
        console.log("[SYNC] No more pages, stopping");
        break;
      }

      page++;
    }

    if (page > MAX_PAGES) {
      console.warn(`[SYNC] Reached max page limit of ${MAX_PAGES}`);
    }

    console.log(`[SYNC] Completed: ${recordsProcessed} total records processed`);

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
