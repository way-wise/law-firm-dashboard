import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, genericOAuth } from "better-auth/plugins";
import { headers } from "next/headers";
import { emailEvents, EmailEventType } from "./events/emailEvent";
import { ac, adminRole, superRole, userRole } from "./permissions";
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
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  verification: {
    modelName: "verifications",
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      emailEvents.emit(EmailEventType.PASSWORD_RESET_EMAIL, {
        email: user.email,
        url,
        token,
      });
    },
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["super"],
      ac,
      roles: {
        super: superRole,
        admin: adminRole,
        user: userRole,
      },
    }),
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
          getUserInfo: async () => {
            // For Docketwise OAuth, we create a placeholder user, So it's shared across all users
            return {
              id: "docketwise_firm_connection",
              email: "docketwise@firm.local",
              name: "Docketwise Connection",
              emailVerified: true,
            };
          },
        },
      ],
    }),
  ],
});

export const getSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
};
