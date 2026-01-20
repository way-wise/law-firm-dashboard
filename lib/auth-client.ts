import { createAuthClient } from "better-auth/react";
import { genericOAuthClient, adminClient } from "better-auth/client/plugins";
import { ac, superRole, adminRole, userRole } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    adminClient({
      ac,
      roles: {
        super: superRole,
        admin: adminRole,
        user: userRole,
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  changePassword,
  requestPasswordReset,
  resetPassword,
} = authClient;
