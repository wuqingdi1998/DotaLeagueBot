import { describe, expect, it } from "vitest";
import {
  organizerLoginContext,
  organizerSessionLoginContext,
} from "./organizer-login-context";

describe("organizer login attempt identity", () => {
  it("uses the player identity for a Discord-linked login", () => {
    const context = organizerLoginContext(
      new Request("https://lsesports.ru/api/auth/organizer"),
      "12345",
    );
    expect(context.attemptKey).toBe("discord:12345");
    expect(context.discordId).toBe("12345");
  });

  it("stores only a hash of the client address for standalone login", () => {
    const request = new Request("https://lsesports.ru/api/auth/organizer", {
      headers: {
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "user-agent": "Test browser",
      },
    });
    const context = organizerLoginContext(request, null);
    expect(context.attemptKey).toMatch(/^client:[a-f\d]{64}$/);
    expect(context.attemptKey).not.toContain("203.0.113.7");
    expect(context.userAgent).toBe("Test browser");
  });

  it("does not expose a standalone session token in the attempt journal", () => {
    const context = organizerSessionLoginContext("private-token", null);
    expect(context.attemptKey).toMatch(/^session:[a-f\d]{64}$/);
    expect(context.attemptKey).not.toContain("private-token");
  });
});
