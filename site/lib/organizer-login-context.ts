import { createHash } from "node:crypto";

export type OrganizerLoginContext = {
  attemptKey: string;
  discordId: string | null;
  userAgent: string | null;
};

function requestClientAddress(request: Request): string {
  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwardedAddress || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function organizerLoginContext(
  request: Request,
  discordId: string | null,
): OrganizerLoginContext {
  const attemptKey = discordId
    ? `discord:${discordId}`
    : `client:${createHash("sha256")
        .update(requestClientAddress(request))
        .digest("hex")}`;
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 300) || null;
  return { attemptKey, discordId, userAgent };
}

export function organizerSessionLoginContext(
  sessionToken: string,
  discordId: string | null,
): OrganizerLoginContext {
  return {
    attemptKey: discordId
      ? `discord:${discordId}`
      : `session:${createHash("sha256").update(sessionToken).digest("hex")}`,
    discordId,
    userAgent: null,
  };
}
