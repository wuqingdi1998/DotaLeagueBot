import { beforeEach, describe, expect, it } from "vitest";
import {
  inspectApiRequest,
  resetApiRequestLimitsForTests,
} from "./request-security";

function request(overrides: Partial<Parameters<typeof inspectApiRequest>[0]> = {}) {
  return {
    method: "POST",
    pathname: "/api/admin/matches",
    origin: "https://lsesports.ru",
    expectedOrigin: "https://lsesports.ru",
    fetchSite: "same-origin",
    contentLength: 128,
    clientAddress: "203.0.113.10",
    now: 1_000,
    ...overrides,
  };
}

describe("API request protection", () => {
  beforeEach(() => resetApiRequestLimitsForTests());

  it("rejects a browser mutation from another origin", () => {
    expect(
      inspectApiRequest(request({ origin: "https://attacker.example" })),
    ).toMatchObject({ status: 403 });
  });

  it("rejects a mutation with neither an origin nor same-origin browser proof", () => {
    expect(
      inspectApiRequest(request({ origin: null, fetchSite: null })),
    ).toMatchObject({ status: 403 });
  });

  it("allows same-origin organizer mutations", () => {
    expect(inspectApiRequest(request())).toBeNull();
  });

  it("rejects oversized JSON before a route reads its body", () => {
    expect(
      inspectApiRequest(request({ contentLength: 600 * 1024 })),
    ).toMatchObject({ status: 413 });
  });

  it("allows two profile backgrounds up to 25 MB each", () => {
    expect(
      inspectApiRequest(
        request({
          pathname: "/api/players/123/background",
          method: "PUT",
          contentLength: 51 * 1024 * 1024,
        }),
      ),
    ).toBeNull();
  });

  it("stops repeated organizer-login attempts from one address", () => {
    const login = request({
      pathname: "/api/auth/organizer",
      clientAddress: "198.51.100.7",
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(inspectApiRequest(login)).toBeNull();
    }
    expect(inspectApiRequest(login)).toMatchObject({
      status: 429,
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("does not share a rate limit between different addresses", () => {
    const first = request({ pathname: "/api/auth/organizer" });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(inspectApiRequest(first)).toBeNull();
    }
    expect(
      inspectApiRequest(
        request({
          pathname: "/api/auth/organizer",
          clientAddress: "198.51.100.8",
        }),
      ),
    ).toBeNull();
  });

  it("cannot bypass the read limit by changing the requested path", () => {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      expect(
        inspectApiRequest(
          request({
            method: "GET",
            pathname: `/api/tournament/${attempt}`,
          }),
        ),
      ).toBeNull();
    }
    expect(
      inspectApiRequest(
        request({ method: "GET", pathname: "/api/a-new-random-path" }),
      ),
    ).toMatchObject({ status: 429 });
  });

  it("stops a team-registration button flood", () => {
    const registration = request({
      pathname: "/api/applications",
      clientAddress: "192.0.2.25",
    });
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect(inspectApiRequest(registration)).toBeNull();
    }
    expect(inspectApiRequest(registration)).toMatchObject({ status: 429 });
  });
});
