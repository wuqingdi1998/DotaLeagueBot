import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), admin: vi.fn(), participants: vi.fn(), races: vi.fn(),
  results: vi.fn(), archive: vi.fn(), history: vi.fn(), query: vi.fn(),
  members: vi.fn(), preview: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getSession: mocks.session, requireAdmin: mocks.admin,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return Response.json({ error: "Нет доступа" }, { status: error.status });
    throw error;
  },
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/app/tournaments/TournamentsHub", () => ({ PlatformShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("./repository", () => ({ loadCompendiumAdminParticipants: mocks.participants, loadCompendiumAdminParticipantHistory: mocks.history }));
vi.mock("./star-race-archive-repository", () => ({ loadCompendiumStarRaceArchive: mocks.races }));
vi.mock("./CompendiumBase", () => ({ CompendiumBase: ({ period = "october" }: { period?: string }) => <div>base:{period}</div> }));
vi.mock("../services/results-repository", () => ({ loadCompendiumResults: mocks.results }));
vi.mock("../sections/CompendiumResults", () => ({ CompendiumResults: () => <div>results</div> }));
vi.mock("@/app/organizer/compendium/services/archive-repository", () => ({ loadArchivedCompendium: mocks.archive }));
vi.mock("@/app/organizer/compendium/sections/ArchivedCompendium", () => ({ ArchivedCompendium: () => <div>archived page</div> }));
vi.mock("@/app/organizer/compendium-october/services/clan-members", () => ({ loadOctoberClanMembers: mocks.members }));
vi.mock("@/app/organizer/compendium-october/services/clan-reservations", () => ({
  loadOctoberClanReservationState: vi.fn().mockResolvedValue({ phase: "finished", isAuthenticated: true, hasAccess: true, canReserve: false, accessRoleName: null, selectedClanId: null }),
}));
vi.mock("@/app/season/services/season-tournament-links", () => ({ getSeasonTournamentLinks: vi.fn().mockResolvedValue({}) }));
vi.mock("@/app/organizer/compendium-october/components/OctoberPreviewProfileActions", () => ({ OctoberPreviewProfileActions: () => null }));
vi.mock("@/app/organizer/compendium-october/sections/OctoberCompendiumPreview", () => ({
  OctoberCompendiumPreview: (props: { personalStars: number }) => { mocks.preview(props); return <div>October page</div>; },
}));

import CurrentBase from "../base/page";
import ArchivedBase from "@/app/organizer/compendium/base/page";
import CurrentResults from "@/app/organizer/compendium-october/results/page";
import ArchivedResults from "@/app/organizer/compendium/results/page";
import ArchivedPage from "@/app/organizer/compendium/page";
import OctoberPage from "@/app/organizer/compendium-october/page";
import { GET } from "@/app/api/admin/compendium-base/participants/[playerId]/history/route";

const privatePages = [CurrentBase, ArchivedBase, CurrentResults, ArchivedResults, ArchivedPage,
  () => OctoberPage({ searchParams: Promise.resolve({}) })];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T12:00:00+03:00"));
  vi.clearAllMocks();
  mocks.members.mockResolvedValue([{ discordId: "100", dotaId: "100", playerName: "Organizer", avatarUrl: null, clanId: "panacea", totalPoints: 93 }]);
  mocks.participants.mockResolvedValue([]);
  mocks.races.mockResolvedValue([]);
  mocks.results.mockResolvedValue({});
  mocks.archive.mockResolvedValue({});
  mocks.history.mockResolvedValue([]);
  mocks.query.mockResolvedValue([]);
  mocks.admin.mockResolvedValue({ actorDiscordId: null });
});
afterEach(() => vi.useRealTimers());

it.each([null, { isAdmin: false, discordId: "100" }])("keeps participant bases and archived pages private for %s", async (user) => {
  mocks.session.mockResolvedValue(user);
  for (const page of privatePages) await expect(page()).rejects.toThrow("NOT_FOUND");
  expect(mocks.participants).not.toHaveBeenCalled();
  expect(mocks.results).not.toHaveBeenCalled();
});

it.each([false, true])("allows linked and password-only organizers to open all private archive pages (standalone: %s)", async (isStandaloneOrganizer) => {
  mocks.session.mockResolvedValue({ isAdmin: true, discordId: isStandaloneOrganizer ? "0" : "100", isStandaloneOrganizer });
  for (const page of privatePages) expect(renderToStaticMarkup(await page())).toBeTruthy();
  expect(mocks.participants).toHaveBeenCalledWith("ti-2026");
  expect(mocks.results).toHaveBeenCalledWith(isStandaloneOrganizer ? undefined : "100", "october");
  expect(mocks.results).toHaveBeenCalledWith(isStandaloneOrganizer ? undefined : "100", "ti-2026");
  expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({ personalStars: isStandaloneOrganizer ? 0 : 93, isOrganizerPreview: true }));
});

it("loads historical reward details from their own event without October audit overlays", async () => {
  const response = await GET(new Request("https://site.test/api/history?period=ti-2026"), { params: Promise.resolve({ playerId: "100" }) });
  expect(response.status).toBe(200);
  expect(mocks.history).toHaveBeenCalledWith("100", "ti-2026");
  expect(mocks.query).not.toHaveBeenCalled();
});

it("rejects unknown periods and unauthenticated history requests before reading rewards", async () => {
  const context = { params: Promise.resolve({ playerId: "100" }) };
  expect((await GET(new Request("https://site.test/api/history?period=other"), context)).status).toBe(400);
  mocks.admin.mockRejectedValueOnce(new Response("Unauthorized", { status: 401 }));
  expect((await GET(new Request("https://site.test/api/history"), context)).status).toBe(401);
  expect(mocks.history).not.toHaveBeenCalled();
});
