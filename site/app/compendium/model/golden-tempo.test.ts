import { expect, it } from "vitest";
import { finalRaceQuests } from "./final-star-race-definitions";
import { evaluateStarRaceRequirement } from "./star-race-evaluation";
import { hasPendingStarRaceStatistics } from "./star-race-statistics";
import { starRaceQuestProgressLabel } from "./star-race";
import type { OpenDotaMatch } from "./types";

const quest = finalRaceQuests("core")[5];
const window = { requirement: quest.requirement, dayStart: new Date("2026-10-24T00:00:00+03:00"),
  dayEnd: new Date("2026-10-25T00:00:00+03:00"), now: new Date("2026-10-24T23:59:59+03:00") };
const goldenMatch = (overrides: Partial<OpenDotaMatch> = {}): OpenDotaMatch => ({
  match_id: 1, account_id: "100", player_slot: 0, radiant_win: true, hero_id: 1,
  game_mode: 22, lobby_type: 7, duration: 1800,
  start_time: Date.parse("2026-10-24T12:00:00+03:00") / 1000, net_worth: 30_000, ...overrides,
});

it("uses cumulative final net worth with an inclusive 60,000 target", () => {
  expect(quest.requirement).toEqual({ kind: "cumulative-net-worth", target: 60_000 });
  expect(starRaceQuestProgressLabel(quest)).toBe("Ценность");
  expect(evaluateStarRaceRequirement({ ...window, matches: [goldenMatch({ net_worth: 60_000 })] }).isComplete).toBe(true);
  expect(evaluateStarRaceRequirement({ ...window, matches: [goldenMatch({ net_worth: 59_999 })] }).isComplete).toBe(false);
});

it("sums ranked and normal All Pick wins exactly once, ignoring losses, Turbo and other dates", () => {
  const result = evaluateStarRaceRequirement({ ...window, matches: [
    goldenMatch({ net_worth: 25_000 }), goldenMatch({ net_worth: 25_000 }),
    goldenMatch({ match_id: 2, lobby_type: 0, net_worth: 35_000 }),
    goldenMatch({ match_id: 3, radiant_win: false, net_worth: 100_000 }),
    goldenMatch({ match_id: 4, game_mode: 23, net_worth: 100_000 }),
    goldenMatch({ match_id: 5, lobby_type: 1, net_worth: 100_000 }),
    goldenMatch({ match_id: 6, start_time: Date.parse("2026-10-23T12:00:00+03:00") / 1000 }),
    goldenMatch({ match_id: 7, start_time: Date.parse("2026-10-24T23:30:00+03:00") / 1000 }),
  ] });
  expect(result).toMatchObject({ isComplete: true, progress: 60_000 });
  expect(result.wins.map(({ matchId }) => matchId)).toEqual(["1", "2"]);
});

it("assigns a cross-midnight victory by its end and does not substitute GPM or earned gold", () => {
  const match = goldenMatch({ start_time: Date.parse("2026-10-23T23:40:00+03:00") / 1000, net_worth: 60_000 });
  expect(evaluateStarRaceRequirement({ ...window, matches: [match] }).isComplete).toBe(true);
  const missing = { ...goldenMatch({ net_worth: null, gold_per_min: 1500 }), total_gold: 100_000 };
  expect(hasPendingStarRaceStatistics({ ...window, matches: [missing] })).toBe(true);
  expect(evaluateStarRaceRequirement({ ...window, matches: [missing] }).progress).toBe(0);
  expect(hasPendingStarRaceStatistics({ ...window, matches: [goldenMatch({ net_worth: 0 })] })).toBe(false);
});
