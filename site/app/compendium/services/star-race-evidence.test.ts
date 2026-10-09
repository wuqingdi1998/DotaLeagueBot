import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ matches: vi.fn(), repair: vi.fn() }));
vi.mock("./opendota", () => ({ fetchRecentPlayerMatches: mocks.matches }));
vi.mock("./star-race-evidence-repository", () => ({ repairStarRaceEvidence: mocks.repair }));
import { restoreStarRaceEvidence } from "./star-race-evidence";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/october-star-race";
import { compendiumHeroById } from "../model/heroes";
import type { AuthUser } from "@/lib/auth";
import type { StarRaceCompletionByDate, StarRaceProgressByDate } from "./star-race-repository";

const dateKey = "2026-10-06";
const checkedAt = "2026-10-06T12:00:00Z";
function match(id: number, damage: number, time = "2026-10-06T09:00:00Z") {
  return { match_id: id, hero_id: 1, player_slot: 0, radiant_win: true,
    game_mode: 22, lobby_type: 7, duration: 1800,
    start_time: Date.parse(time) / 1000, tower_damage: damage };
}
function input() {
  return {
    user: { discordId: "100", dotaId: "301109815" } as AuthUser,
    quests: OCTOBER_COMPENDIUM_WEEKS[0].quests,
    completions: new Map([[dateKey, {
      completedAt: checkedAt, isManual: false, hasCompleteMatchEvidence: false,
      wins: [{ hero: compendiumHeroById(1), matchId: "2002" }],
    }]]) as StarRaceCompletionByDate,
    progresses: new Map([[dateKey, { current: 17407, checkedAt, wins: [] }]]) as StarRaceProgressByDate,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  mocks.repair.mockResolvedValue(true);
  mocks.matches.mockResolvedValue([match(2002, 8407), match(2001, 9000),
    match(2003, 8000, "2026-10-06T15:00:00Z"),
    { ...match(2004, 50000), radiant_win: false },
    match(2005, 30000, "2026-10-05T09:00:00Z")]);
});
afterEach(() => vi.useRealTimers());

it("restores all original contributing matches, including repeated heroes, without later matches or losses", async () => {
  const data = input();
  await restoreStarRaceEvidence(data);
  expect(mocks.matches).toHaveBeenCalledWith(data.user.dotaId, { historyDays: 5 });
  expect(mocks.repair).toHaveBeenCalledWith({ playerId: "100", dateKey,
    wins: [expect.objectContaining({ matchId: "2002" }), expect.objectContaining({ matchId: "2001" })] });
  expect(data.completions.get(dateKey)).toMatchObject({ completedAt: checkedAt,
    hasCompleteMatchEvidence: true, wins: [{ matchId: "2002" }, { matchId: "2001" }] });
});
it("keeps the original result if the history no longer reproduces its saved statistic", async () => {
  mocks.matches.mockResolvedValue([match(2002, 8407)]);
  const data = input();
  await restoreStarRaceEvidence(data);
  expect(mocks.repair).not.toHaveBeenCalled();
  expect(data.completions.get(dateKey)?.wins).toHaveLength(1);
});
it("can repair a previous week's evidence after the next week has started", async () => {
  vi.setSystemTime(new Date("2026-10-13T12:00:00Z"));
  const data = input();
  data.quests = OCTOBER_COMPENDIUM_WEEKS.flatMap((week) => week.quests);
  await restoreStarRaceEvidence(data);
  expect(data.completions.get(dateKey)?.hasCompleteMatchEvidence).toBe(true);
  expect(mocks.matches).toHaveBeenCalledWith(data.user.dotaId, { historyDays: 9 });
});
it("does not replace evidence with a different set that happens to have the same total", async () => {
  mocks.matches.mockResolvedValue([match(3001, 17407)]);
  await restoreStarRaceEvidence(input());
  expect(mocks.repair).not.toHaveBeenCalled();
});
it("does not fetch history for complete evidence or manually credited tasks", async () => {
  const data = input();
  data.completions.get(dateKey)!.hasCompleteMatchEvidence = true;
  await restoreStarRaceEvidence(data);
  data.completions.get(dateKey)!.hasCompleteMatchEvidence = false;
  data.completions.get(dateKey)!.isManual = true;
  await restoreStarRaceEvidence(data);
  expect(mocks.matches).not.toHaveBeenCalled();
});
it("keeps the completed task available when OpenDota is unavailable", async () => {
  mocks.matches.mockRejectedValue(new Error("Unavailable"));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    const data = input();
    await expect(restoreStarRaceEvidence(data)).resolves.toBeUndefined();
    expect(data.completions.get(dateKey)?.wins).toHaveLength(1);
    expect(mocks.repair).not.toHaveBeenCalled();
  } finally { warning.mockRestore(); }
});
