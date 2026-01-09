import "server-only";
import { auth } from "./auth";
import prisma from "./prisma";

// Get Docketwise access token
export async function getDocketwiseToken(userId: string): Promise<string | null> {
  const account = await prisma.accounts.findFirst({
    where: {
      userId: userId,
      providerId: "docketwise",
    },
  });

  if (!account) {
    return null;
  }

  try {
    const result = await auth.api.getAccessToken({
      body: {
        providerId: "docketwise",
        userId: userId,
      },
    });

    return result?.accessToken || null;
  } catch (error) {
    console.error("Error getting Docketwise access token:", error);
    return null;
  }
}
