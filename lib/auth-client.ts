import { createAuthClient } from "better-auth/react";

export const {
  signIn,
  signUp,
  signOut,
  changePassword,
  requestPasswordReset,
  resetPassword,
} = createAuthClient();
