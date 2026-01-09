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
          accessType: "offline", // Request refresh token
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
