import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  new URL("../app/fearless-draft/server/deadline-service.ts", import.meta.url),
  "utf8",
);
const snapshot = readFileSync(
  new URL("../app/fearless-draft/server/snapshot-service.ts", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL(
    "../app/api/internal/fearless-draft/deadlines/route.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("Fearless Draft durable deadlines", () => {
  it("settles all persisted deadlines through the internal scheduler route", () => {
    expect(route).toContain("schedulerInternalAuthError");
    expect(route).toContain("processFearlessDraftDeadlines");
    expect(service).toContain("status = 'EXPIRED'");
    expect(service).toContain("settleExpiredDraftEndRequests");
    expect(service).toContain("settleExpiredDraftSeries");
    expect(service).toContain("nextDueAt");
  });

  it("does not rely on opening a snapshot to advance deadlines", () => {
    expect(snapshot).not.toContain("settleExpiredDraftEndRequests");
    expect(snapshot).not.toContain("settleExpiredDraft(user.discordId");
    expect(snapshot).not.toContain("advanceBotDraft(user.discordId");
    expect(snapshot).not.toContain("SET status = 'EXPIRED'");
  });
});
