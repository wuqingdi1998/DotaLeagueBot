import { moscowDateTimeInputToIso } from "./moscow-date-time";

export function normalizeMatchScheduledAt(body: { scheduledAt?: string | null }): boolean {
  if (body.scheduledAt === undefined) return true;
  if (body.scheduledAt === null || body.scheduledAt === "" || body.scheduledAt === "TBA") {
    body.scheduledAt = null;
    return true;
  }
  if (typeof body.scheduledAt !== "string") return false;
  const value = body.scheduledAt.trim();
  if (!value || /^\d{4}-\d{2}-\d{2}(T\d{0,2}:?\d{0,1})?$/.test(value)) {
    body.scheduledAt = null;
    return true;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return false;
  const normalized = moscowDateTimeInputToIso(value);
  if (!normalized) return false;
  body.scheduledAt = normalized;
  return true;
}
