import { expect, it } from "vitest";
import { hasPendingStarRaceStatistics } from "./star-race-statistics";

const match = { match_id: 1, account_id: 100, player_slot: 0, radiant_win: true,
  hero_id: 1, game_mode: 22, lobby_type: 7, duration: 1800,
  start_time: Date.parse("2026-10-06T10:00:00+03:00") / 1000 };
const window = { dayStart: new Date("2026-10-06T00:00:00+03:00"),
  dayEnd: new Date("2026-10-07T00:00:00+03:00"), now: new Date("2026-10-06T12:00:00+03:00") };
it("waits for missing stats in eligible wins but accepts zero and ignores losses", () => {
  const input = { ...window, requirement: { kind: "winning-building-damage" as const, targetDamage: 15000 } };
  expect(hasPendingStarRaceStatistics({ ...input, matches: [match] })).toBe(true);
  expect(hasPendingStarRaceStatistics({ ...input, matches: [{ ...match, tower_damage: 0 }] })).toBe(false);
  expect(hasPendingStarRaceStatistics({ ...input, matches: [{ ...match, radiant_win: false }] })).toBe(false);
});
it("does not wait for stats on heroes outside the task", () => {
  expect(hasPendingStarRaceStatistics({ ...window, matches: [match],
    requirement: { kind: "cumulative-ranked-win-stat", heroIds: [2], stat: "kills", target: 100 } })).toBe(false);
});
