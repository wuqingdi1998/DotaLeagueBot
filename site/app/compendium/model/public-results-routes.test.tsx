import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), results: vi.fn(), excluded: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getSession: mocks.session }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), one: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (target: string) => { throw new Error(`REDIRECT:${target}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("@/app/tournaments/TournamentsHub", () => ({ PlatformShell: () => null }));
vi.mock("../services/results-repository", () => ({ loadCompendiumResults: mocks.results }));
vi.mock("../services/participant-access", () => ({ isExcludedFromCompendium: mocks.excluded }));

import CompendiumPage from "../page";
import ResultsPage from "../results/page";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.excluded.mockResolvedValue(false);
  mocks.results.mockResolvedValue({ period: "october", closure: "finished", isFinished: true });
});
afterEach(() => vi.useRealTimers());

it.each([null, { discordId: "100", isAdmin: false }, { discordId: "100", isAdmin: true }])(
  "archives both public URLs exactly at the deadline for %s without reading results", async (user) => {
    vi.setSystemTime(new Date("2026-10-31T21:00:00+03:00"));
    mocks.session.mockResolvedValue(user);
    const target = user?.isAdmin ? "/organizer/compendium-october/results" : "/";
    for (const page of [CompendiumPage, ResultsPage]) {
      await expect(page()).rejects.toThrow(`REDIRECT:${target}`);
    }
    expect(mocks.results).not.toHaveBeenCalled();
    expect(mocks.excluded).not.toHaveBeenCalled();
  },
);

it("continues to show participants their public results before the cutoff", async () => {
  vi.setSystemTime(new Date("2026-10-31T20:59:59+03:00"));
  mocks.session.mockResolvedValue({ discordId: "100", isAdmin: false });
  expect(await ResultsPage()).toBeTruthy();
  expect(mocks.results).toHaveBeenCalledWith("100");
});
