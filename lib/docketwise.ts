import "server-only";
import prisma from "./prisma";
import { auth } from "./auth";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

/**
 * Get Docketwise access token for the current user
 * This retrieves the token from the better-auth accounts table
 */
async function getDocketwiseAccessToken(userId: string): Promise<string | null> {
  // Get the Docketwise account for this user
  const account = await prisma.accounts.findFirst({
    where: {
      userId: userId,
      providerId: "docketwise",
    },
  });

  if (!account || !account.accessToken) {
    return null;
  }

  // Check if token is expired
  if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < new Date()) {
    // Token expired, need to refresh
    if (account.refreshToken) {
      const newToken = await refreshDocketwiseToken(account.refreshToken, account.id);
      return newToken;
    }
    return null;
  }

  return account.accessToken;
}

/**
 * Refresh Docketwise access token
 */
async function refreshDocketwiseToken(refreshToken: string, accountId: string): Promise<string | null> {
  try {
    const response = await fetch(process.env.DOCKETWISE_OAUTH_TOKEN_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DOCKETWISE_CLIENT_ID!,
        client_secret: process.env.DOCKETWISE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Failed to refresh Docketwise token");
      return null;
    }

    const data = await response.json();

    // Update the account with new tokens
    await prisma.accounts.update({
      where: { id: accountId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing Docketwise token:", error);
    return null;
  }
}

/**
 * Make authenticated request to Docketwise API
 * Automatically gets the token for the current authenticated user
 */
export async function docketwiseRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get current session
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Get access token for this user
  const token = await getDocketwiseAccessToken(session.user.id);

  if (!token) {
    throw new Error("No valid Docketwise access token. Please connect your Docketwise account.");
  }

  const url = `${DOCKETWISE_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Docketwise API error: ${response.status} - ${error}`);
  }

  // Get pagination info from headers
  const paginationHeader = response.headers.get("X-Pagination");
  const data = await response.json();

  // If pagination header exists, return it with data
  if (paginationHeader) {
    const pagination = JSON.parse(paginationHeader);
    return {
      data,
      pagination,
    } as T;
  }

  return data;
}

/**
 * Check if current user has Docketwise connected
 */
export async function isDocketwiseConnected(userId: string): Promise<boolean> {
  const account = await prisma.accounts.findFirst({
    where: {
      userId: userId,
      providerId: "docketwise",
    },
  });

  return !!account;
}
