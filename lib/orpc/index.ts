import { auth } from "@/lib/auth";
import { ORPCError, os as baseOs } from "@orpc/server";
import "server-only";

// Base os with headers context
export const os = baseOs.$context<{ headers: Headers }>();

// Auth middleware - validates session and adds user/session to context
const authMiddleware = os.middleware(async ({ context, next }) => {
  const sessionData = await auth.api.getSession({
    headers: context.headers,
  });

  if (!sessionData?.session || !sessionData?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: sessionData.session,
      user: sessionData.user,
    },
  });
});

// Protected procedures - auth required
export const authorized = os.use(authMiddleware);
