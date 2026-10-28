import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { developmentAccessResponse } from "./access";
import { hasOrganizerAccess } from "@/lib/site-break";

vi.mock("@/lib/site-break", () => ({ hasOrganizerAccess: vi.fn() }));
const access = vi.mocked(hasOrganizerAccess);

beforeEach(() => {
  vi.stubEnv("SITE_ENVIRONMENT", "development");
  access.mockReset();
  access.mockResolvedValue(false);
});
afterEach(() => vi.unstubAllEnvs());

describe("development data access", () => {
  it.each(["/compendium", "/compendium/results", "/compendium/base", "/compendium/test",
    "/organizer/compendium", "/organizer/compendium-october/results", "/api/compendium",
    "/api/admin/compendium-base/participants/1/history", "/api/internal/compendium-october/form-clans"])("removes %s from development even for organizers", async (path) => {
    access.mockResolvedValue(true);
    const response = await developmentAccessResponse(new NextRequest(`https://dev.lsesports.ru${path}`));
    expect(response?.status).toBe(404);
    expect(access).not.toHaveBeenCalled();
    vi.stubEnv("SITE_ENVIRONMENT", "production");
    expect(await developmentAccessResponse(new NextRequest(`https://lsesports.ru${path}`))).toBeNull();
  });
  it("does not affect production visitors", async () => {
    vi.stubEnv("SITE_ENVIRONMENT", "production");
    expect(await developmentAccessResponse(new NextRequest("https://lsesports.ru/players/123"))).toBeNull();
    expect(access).not.toHaveBeenCalled();
  });
  it("redirects guests to the organizer login and preserves the requested page", async () => {
    const response = await developmentAccessResponse(new NextRequest("https://dev.lsesports.ru/season?tab=rounds"));
    const destination = new URL(response!.headers.get("location")!);
    expect(destination.pathname).toBe("/development/login");
    expect(destination.searchParams.get("returnTo")).toBe("/season?tab=rounds");
  });
  it.each(["/api/players/123", "/api/development/changes", "/api/players/123/background"])("blocks unauthenticated requests to %s", async (path) => {
    const response = await developmentAccessResponse(new NextRequest(`https://dev.lsesports.ru${path}`));
    expect(response?.status).toBe(401);
  });
  it.each(["/api/health", "/api/version", "/api/auth/organizer", "/development/login"])("leaves %s available before login", async (path) => {
    expect(await developmentAccessResponse(new NextRequest(`https://dev.lsesports.ru${path}`))).toBeNull();
    expect(access).not.toHaveBeenCalled();
  });
  it("allows a verified organizer even while testing participant view", async () => {
    access.mockResolvedValue(true);
    const request = new NextRequest("https://dev.lsesports.ru/season", {
      headers: { cookie: "ls_organizer_session=organizer-token; ls_session=player-token; ls_participant_view=1" },
    });
    expect(await developmentAccessResponse(request)).toBeNull();
    expect(access).toHaveBeenCalledWith({ organizerSessionToken: "organizer-token", playerSessionToken: "player-token" });
  });
  it("fails closed when the session database is unavailable", async () => {
    access.mockRejectedValue(new Error("offline"));
    const response = await developmentAccessResponse(new NextRequest("https://dev.lsesports.ru/season"));
    expect(response?.status).toBe(503);
  });
});
