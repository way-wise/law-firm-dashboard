import { syncMatters } from "@/lib/sync/matters-sync";
import { authorized } from "@/lib/orpc";
import * as z from "zod";

const syncResultSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  created: z.number(),
  updated: z.number(),
  message: z.string().optional(),
});

export const syncMattersRoute = authorized
  .route({
    method: "POST",
    path: "/sync/matters",
    summary: "Sync matters from Docketwise",
    tags: ["Sync"],
  })
  .input(z.object({}))
  .output(syncResultSchema)
  .handler(async ({ context }) => {
    try {
      const result = await syncMatters(context.user.id);

      return {
        success: true,
        total: result.total,
        created: result.created,
        updated: result.updated,
        message: `Synced ${result.total} matters (${result.created} new, ${result.updated} updated)`,
      };
    } catch (error) {
      console.error("[MATTERS-SYNC-ROUTE] Error:", error);
      return {
        success: false,
        total: 0,
        created: 0,
        updated: 0,
        message: error instanceof Error ? error.message : "Failed to sync matters",
      };
    }
  });
