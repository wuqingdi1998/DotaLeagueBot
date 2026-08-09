import { describe, expect, it } from "vitest";
import { isSiteBreakBypassPath } from "./site-break-paths";

describe("site break path boundaries", () => {
  it("keeps recovery, organizer login and health checks available", () => {
    expect(isSiteBreakBypassPath("/break")).toBe(true);
    expect(isSiteBreakBypassPath("/api/health")).toBe(true);
    expect(isSiteBreakBypassPath("/api/site-break/status")).toBe(true);
    expect(isSiteBreakBypassPath("/api/auth/discord")).toBe(true);
    expect(isSiteBreakBypassPath("/api/auth/callback")).toBe(true);
    expect(isSiteBreakBypassPath("/api/auth/organizer")).toBe(true);
    expect(isSiteBreakBypassPath("/api/auth/logout")).toBe(true);
  });

  it("does not bypass public pages or ordinary APIs", () => {
    expect(isSiteBreakBypassPath("/")).toBe(false);
    expect(isSiteBreakBypassPath("/tournaments")).toBe(false);
    expect(isSiteBreakBypassPath("/fearless-draft")).toBe(false);
    expect(isSiteBreakBypassPath("/api/tournaments")).toBe(false);
    expect(isSiteBreakBypassPath("/api/fearless-draft")).toBe(false);
  });
});
