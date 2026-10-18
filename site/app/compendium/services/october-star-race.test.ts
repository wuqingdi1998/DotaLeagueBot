import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadPersonalStarRaceStars: vi.fn(), loadStarRaceRank: vi.fn(),
  loadStarRaceCompletions: vi.fn(), loadStarRaceProgress: vi.fn(),
  selection: vi.fn(),
  loadPendingArcanaVerifications: vi.fn(), loadFinalPrediction: vi.fn(),
}));
vi.mock("./final-race-path", () => ({ loadFinalRaceSelection: mocks.selection }));
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

it("hides every final-week quest until a persistent path has been chosen", async () => {
  mocks.selection.mockResolvedValue(null);
  const race = await loadStarRace({ discordId: "100", isAdmin: false } as AuthUser, new Date("2026-10-21T12:00:00+03:00"));
  expect(race.pathSelection).toEqual({ path: null, selectedOn: null, canChoose: true });
  expect(race.quests).toEqual([]);
});
it("loads a late support path with the correct favorites, rewards, prizes and cumulative assists", async () => {
  mocks.selection.mockResolvedValue({ path: "support", selectedOn: "2026-10-21" });
  const race = await loadStarRace({ discordId: "100", isAdmin: false } as AuthUser, new Date("2026-10-22T12:00:00+03:00"));
  expect(race.title).toBe("Гонка за звёздами · Путь Созидания");
  expect(race.quests[2].heroes.map(({ name }) => name)).toEqual(["Crystal Maiden", "Dazzle", "Lich", "Lion", "Pudge", "Witch Doctor"]);
  expect(race.quests[3]).toMatchObject({ title: "Рядом", phase: "active", progress: { current: 0, target: 35 } });
  expect(race.quests.map(({ rewardStars }) => rewardStars)).toEqual([4, 4, 4, 4, 4, 4, 5]);
  expect(race.prizes[0].title).toContain("3 месяца + Trove of Terror");
});
