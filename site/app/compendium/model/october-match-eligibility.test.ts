import { describe, expect, it } from "vitest";
import { isCompendiumEligibleMatch } from "./match-eligibility";
import {
  findDistinctMatchingWins, findGameModeWin, findMatchingWin,
  findRankedStatWin, scanCumulativeRankedWinStat, scanRankedWins,
  scanWinningBuildingDamage,
} from "./matches";
import type { OpenDotaMatch } from "./types";

function normalMatch(endedAt: string, overrides: Partial<OpenDotaMatch> = {}): OpenDotaMatch {
  return {
    match_id: 9001, player_slot: 0, radiant_win: true, duration: 1800,
    start_time: Date.parse(endedAt) / 1000 - 1800,
    game_mode: 22, lobby_type: 0, hero_id: 1,
    kills: 15, hero_damage: 30_000, tower_damage: 15_000,
    ...overrides,
  };
}

describe("October normal All Pick eligibility", () => {
  it.each([
    ["2026-10-07T23:59:59+03:00", false],
    ["2026-10-08T00:00:00+03:00", true],
    ["2026-10-25T23:59:59+03:00", true],
    ["2026-10-26T00:00:00+03:00", false],
    ["2026-08-10T12:00:00+03:00", false],
    ["2027-10-08T12:00:00+03:00", false],
  ])("uses Moscow match end boundary %s", (endedAt, expected) => {
    expect(isCompendiumEligibleMatch(normalMatch(endedAt))).toBe(expected);
  });

  it.each([1, 2, 3, 4, 16, 23])("rejects normal lobby mode %s", (game_mode) => {
    expect(isCompendiumEligibleMatch(normalMatch("2026-10-08T12:00:00+03:00", { game_mode }))).toBe(false);
  });

  it.each([1, 2, 3, 4, 8, 9])("rejects other lobby %s", (lobby_type) => {
    expect(isCompendiumEligibleMatch(normalMatch("2026-10-08T12:00:00+03:00", { lobby_type }))).toBe(false);
  });

  it.each([5, 6, 7])("preserves ranked lobby %s outside October", (lobby_type) => {
    expect(isCompendiumEligibleMatch(normalMatch("2026-08-10T12:00:00+03:00", { lobby_type }))).toBe(true);
  });

  const match = normalMatch("2026-10-08T12:00:00+03:00");
  const window = {
    dayStart: new Date("2026-10-08T00:00:00+03:00"),
    dayEnd: new Date("2026-10-09T00:00:00+03:00"),
    now: new Date("2026-10-08T13:00:00+03:00"),
  };

  it("counts normal victories for hero quests, runes, clan outings and every race statistic", () => {
    const input = { ...window, matches: [match], heroIds: [1] };
    expect(findMatchingWin(input)?.matchId).toBe("9001");
    expect(scanRankedWins(input)).toHaveLength(1);
    expect(findDistinctMatchingWins({ ...input, requiredDistinctWins: 1 })).toHaveLength(1);
    expect(findRankedStatWin({ ...input, stat: "kills", minimum: 10 })?.matchId).toBe("9001");
    expect(findRankedStatWin({ ...input, stat: "hero_damage", minimum: 30_000 })?.matchId).toBe("9001");
    expect(scanCumulativeRankedWinStat({ ...input, stat: "hero_damage" }).total).toBe(30_000);
    expect(scanCumulativeRankedWinStat({ ...input, stat: "kills" }).total).toBe(15);
    expect(scanWinningBuildingDamage(input).totalDamage).toBe(15_000);
    expect(findGameModeWin({ ...input, gameMode: 23 })).toBeNull();
    expect(findGameModeWin({ ...input, matches: [{ ...match, game_mode: 23 }], gameMode: 23 })?.matchId).toBe("9001");
  });

  it.each([
    { radiant_win: false }, { hero_id: 2 },
    { start_time: Date.parse("2026-10-08T14:00:00+03:00") / 1000 },
    { start_time: Date.parse("2026-10-07T12:00:00+03:00") / 1000 },
  ])("still enforces victory, hero, date and verification time: %j", (overrides) => {
    expect(findMatchingWin({ ...window, matches: [{ ...match, ...overrides }], heroIds: [1] })).toBeNull();
  });
});
