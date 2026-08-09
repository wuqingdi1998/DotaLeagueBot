import { createHash } from "node:crypto";

export const playerSessionCookie = "ls_session";
export const organizerSessionCookie = "ls_organizer_session";

export function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
