import "server-only";
import { auth } from "./auth";
import prisma from "./prisma";

// Get the global Docketwise access token (shared across all users)
// Any user who has connected Docketwise provides the token for everyone
export async function getDocketwiseToken(): Promise<string | null> {
  // Find ANY account with Docketwise connected (not user-specific)
  const account = await prisma.accounts.findFirst({
    where: {
      providerId: "docketwise",
    },
    orderBy: {
      updatedAt: "desc", // Get the most recently updated one
    },
  });

  if (!account) {
    return null;
  }

  try {
    const result = await auth.api.getAccessToken({
      body: {
        providerId: "docketwise",
        userId: account.userId, // Use the userId of whoever connected
      },
    });

    return result?.accessToken || null;
  } catch (error) {
    console.error("Error getting Docketwise access token:", error);
    return null;
  }
}

// Check if Docketwise is connected (for any user in the system)
export async function isDocketwiseConnected(): Promise<boolean> {
  const account = await prisma.accounts.findFirst({
    where: {
      providerId: "docketwise",
    },
  });

  return !!account;
}
