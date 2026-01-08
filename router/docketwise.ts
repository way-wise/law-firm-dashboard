import { os } from "@/lib/orpc";

// Get Todos
export const getDocketwiseToken = os
  .route({
    method: "GET",
    path: "/docketwise/oauth2/callback",
    summary: "Docketwise OAuth2 callback",
    tags: ["Docketwise"],
  })
  .handler(async () => {
    return {
        message: "Docketwise OAuth2 callback",
    }
  });