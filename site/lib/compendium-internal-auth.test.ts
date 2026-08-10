import { afterEach, describe, expect, it } from "vitest";
import { compendiumInternalAuthError } from "./compendium-internal-auth";

const secret = "a-secure-test-secret-with-24-chars";

afterEach(() => {
  delete process.env.COMPENDIUM_SCHEDULER_SECRET;
});

describe("internal compendium authorization", () => {
  it("accepts the shared bot secret", () => {
    process.env.COMPENDIUM_SCHEDULER_SECRET = secret;
    const request = new Request("https://example.com/internal", {
      headers: { Authorization: `Bearer ${secret}` },
    });

    expect(compendiumInternalAuthError(request)).toBeNull();
  });

  it("rejects a wrong secret", () => {
    process.env.COMPENDIUM_SCHEDULER_SECRET = secret;
    const request = new Request("https://example.com/internal", {
      headers: { Authorization: "Bearer wrong-secret" },
    });

    expect(compendiumInternalAuthError(request)?.status).toBe(401);
  });

  it("refuses to run without a sufficiently strong configured secret", () => {
    process.env.COMPENDIUM_SCHEDULER_SECRET = "short";
    const request = new Request("https://example.com/internal");

    expect(compendiumInternalAuthError(request)?.status).toBe(503);
  });
});
