import { isDocketwiseConnected } from "@/lib/docketwise";
import { authorized } from "@/lib/orpc";
import * as z from "zod";

// Check Docketwise connection status
export const getConnectionStatus = authorized
  .route({
    method: "GET",
    path: "/docketwise/status",
    summary: "Check if Docketwise is connected",
    tags: ["Docketwise"],
  })
  .input(z.object({}))
  .output(z.object({ connected: z.boolean() }))
  .handler(async () => {
    const connected = await isDocketwiseConnected();
    return { connected };
  });
