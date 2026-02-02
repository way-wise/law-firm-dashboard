import { sendPasswordResetEmail } from "@/lib/emails";
import { EventEmitter } from "events";

export const emailEvents = new EventEmitter();

export enum EmailEventType {
  VERIFY_EMAIL = "verify-email",
  PASSWORD_RESET_EMAIL = "password-reset-email",
}

emailEvents.on(
  EmailEventType.PASSWORD_RESET_EMAIL,
  async ({ email, url, token }) => {
    await sendPasswordResetEmail(email, token, url);
  },
);