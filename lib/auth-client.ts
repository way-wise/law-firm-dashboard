import { createAuthClient } from "better-auth/react";
import { genericOAuthClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient(), adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  changePassword,
  requestPasswordReset,
  resetPassword,
} = authClient;
