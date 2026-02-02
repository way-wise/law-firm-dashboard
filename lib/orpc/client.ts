import { router } from "@/router";
import { createORPCClient, createSafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

declare global {
  var $client: RouterClient<typeof router> | undefined;
}

/**
 * Lazy link creation - only create RPCLink when actually needed on client side
 */
function getLink() {
  if (typeof window === "undefined") {
    throw new Error("RPCLink is not allowed on the server side.");
  }
  
  return new RPCLink({
    url: () => `${window.location.origin}/rpc`,
  });
}

/**
 * Get client - uses server-side client if available, otherwise creates browser client
 */
function getClient(): RouterClient<typeof router> {
  // Server-side: use the global server client
  if (globalThis.$client) {
    return globalThis.$client;
  }
  
  // Client-side: create browser RPC client
  if (typeof window !== "undefined") {
    return createORPCClient(getLink());
  }
  
  throw new Error("No ORPC client available - server client not initialized");
}

/**
 * Client instance - dynamically resolves to server or browser client
 */
export const client = new Proxy({} as RouterClient<typeof router>, {
  get(target, prop) {
    return getClient()[prop as keyof RouterClient<typeof router>];
  },
});

/**
 * Safe client for error handling
 */
export const safeClient = createSafeClient(client);
