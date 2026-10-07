import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadPersonalStarRaceStars: vi.fn(), loadStarRaceRank: vi.fn(),
  loadStarRaceCompletions: vi.fn(), loadStarRaceProgress: vi.fn(),
  loadPendingArcanaVerifications: vi.fn(), loadFinalPrediction: vi.fn(),
}));
vi.mock("./star-race-repository", () => ({ ...mocks }));
vi.mock("./star-race-arcana-repository", () => ({ loadPendingArcanaVerifications: mocks.loadPendingArcanaVerifications }));
vi.mock("./star-race-final-prediction-repository", () => ({ loadFinalPrediction: mocks.loadFinalPrediction }));
import { loadStarRace } from "./star-race";
import type { AuthUser } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadPersonalStarRaceStars.mockResolvedValue(8);
  mocks.loadStarRaceRank.mockResolvedValue(1);
  mocks.loadStarRaceCompletions.mockResolvedValue(new Map());
  mocks.loadStarRaceProgress.mockResolvedValue(new Map());
});

it("loads October quests without reading last compendium's final prediction or Arcana checks", async () => {
  const user = { discordId: "100", isAdmin: false } as AuthUser;
  const race = await loadStarRace(user, new Date("2026-10-07T12:00:00+03:00"));
  expect(race.id).toBe("2026-10-05");
  expect(race.personalStars).toBe(8);
  expect(race.quests).toContainEqual(expect.objectContaining({
    dateKey: "2026-10-07", title: "Передовая", phase: "active",
  }));
  expect(mocks.loadFinalPrediction).not.toHaveBeenCalled();
  expect(mocks.loadPendingArcanaVerifications).not.toHaveBeenCalled();
});
