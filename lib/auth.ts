import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { headers } from "next/headers";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  user: {
    modelName: "users",
  },
  session: {
    modelName: "sessions",
  },
  account: {
    modelName: "accounts",
  },
  verification: {
    modelName: "verifications",
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    nextCookies(),
    genericOAuth({
      config: [
        {
          providerId: "docketwise",
          clientId: process.env.DOCKETWISE_CLIENT_ID!,
          clientSecret: process.env.DOCKETWISE_CLIENT_SECRET!,
          authorizationUrl: process.env.DOCKETWISE_OAUTH_AUTHORIZE_URL!,
          tokenUrl: process.env.DOCKETWISE_OAUTH_TOKEN_URL!,
          redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/oauth2/callback/docketwise`,
          scopes: ["public", "write"],
          pkce: false,
          accessType: "offline",
          // Docketwise doesn't have a userInfo endpoint, so we provide a custom getUserInfo
          // that returns a unique ID based on the access token (for linking purposes)
          getUserInfo: async (tokens) => {
            // Since Docketwise doesn't provide user info, we generate a unique ID
            // based on the access token hash. This is used for account linking only.
            // The actual user is already authenticated via better-auth session.
            const tokenHash = Buffer.from(
              tokens.accessToken.slice(0, 32),
            ).toString("base64url");
            return {
              id: `docketwise_${tokenHash}`,
              email: undefined,
              name: "Docketwise Account",
              emailVerified: false,
            };
          },
        },
      ],
    }),
  ],
});

// Get the current user session
export const getSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
};
