import { describe, expect, it } from "vitest";
import { finalRaceQuests, FINAL_RACE_PRIZES } from "./final-star-race-definitions";
import { compendiumHeroById } from "./heroes";
import { evaluateStarRaceRequirement } from "./star-race-evaluation";
import { hasPendingStarRaceStatistics } from "./star-race-statistics";
import { starRaceForMoment } from "./star-race";
import type { OpenDotaMatch } from "./types";

const match = (overrides: Partial<OpenDotaMatch> = {}): OpenDotaMatch => ({
  match_id: 1, player_slot: 0, radiant_win: true, duration: 1800, game_mode: 22,
  lobby_type: 7, hero_id: 1, start_time: Date.parse("2026-10-21T10:00:00+03:00") / 1000,
  assists: 20, deaths: 3, hero_healing: 10_000, gold_per_min: 700, ...overrides,
});
const window = { dayStart: new Date("2026-10-21T00:00:00+03:00"), dayEnd: new Date("2026-10-22T00:00:00+03:00"), now: new Date("2026-10-21T20:00:00+03:00") };

describe("released final race", () => {
  it("switches weeks exactly at Moscow midnight and preserves the final end boundary", () => {
    expect(starRaceForMoment(new Date("2026-10-18T23:59:59.999+03:00")).id).toBe("2026-10-12");
    expect(starRaceForMoment(new Date("2026-10-19T00:00:00+03:00")).id).toBe("2026-10-19");
    expect(starRaceForMoment(new Date("2026-10-25T23:59:59+03:00")).endsAt).toBe("2026-10-26T00:00:00+03:00");
  });

  it.each(["core", "support"] as const)("sorts the %s favorites and provides 29 stars and both prizes", (path) => {
    const quests = finalRaceQuests(path);
    const requirement = quests[2].requirement;
    expect(quests[2].title).toBe("Всеобщие любимчики");
    expect(requirement.kind).toBe("distinct-hero-wins");
    if (requirement.kind !== "distinct-hero-wins") throw new Error("Missing favorites");
    const names = requirement.heroIds.map((id) => compendiumHeroById(id).name);
    expect(names).toEqual(path === "core"
      ? ["Anti-Mage", "Axe", "Invoker", "Legion Commander", "Phantom Lancer", "Windranger"]
      : ["Crystal Maiden", "Dazzle", "Lich", "Lion", "Pudge", "Witch Doctor"]);
    expect(quests.map(({ rewardStars }) => rewardStars)).toEqual([4, 4, 4, 4, 4, 4, 5]);
    expect(FINAL_RACE_PRIZES.map(({ title }) => title)).toEqual([
      "Подписка на любую цветную руну на 3 месяца + Trove of Terror",
      "Подписка на любую цветную руну на 1 месяц + Trove of Terror",
    ]);
    for (const lobby_type of [0, 7]) {
      expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ hero_id: requirement.heroIds[0], lobby_type })] }).isComplete).toBe(true);
    }
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ hero_id: 99 })] }).isComplete).toBe(false);
  });

  it("accepts only a ranked win on Monday", () => {
    const requirement = finalRaceQuests("core")[0].requirement;
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match()] }).isComplete).toBe(true);
    for (const overrides of [{ lobby_type: 0 }, { game_mode: 23 }, { radiant_win: false }]) {
      expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match(overrides)] }).isComplete).toBe(false);
    }
  });

  it.each([
    ["core", 3, "gold_per_min", 650, 649], ["core", 5, "gold_per_min", 700, 699],
    ["core", 6, "deaths", 3, 4], ["support", 1, "assists", 20, 19],
    ["support", 5, "hero_healing", 10_000, 9_999], ["support", 6, "deaths", 10, 11],
  ] as const)("checks %s day %s statistic %s at its boundary", (path, day, stat, accepted, rejected) => {
    const requirement = finalRaceQuests(path)[day].requirement;
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ [stat]: accepted })] }).isComplete).toBe(true);
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ [stat]: rejected })] }).isComplete).toBe(false);
    expect(hasPendingStarRaceStatistics({ ...window, requirement, matches: [match({ [stat]: null })] })).toBe(true);
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ [stat]: null })] }).isComplete).toBe(false);
  });

  it("requires both Sunday support conditions in the same winning match", () => {
    const requirement = finalRaceQuests("support")[6].requirement;
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ assists: 19 })] }).isComplete).toBe(false);
    expect(evaluateStarRaceRequirement({ ...window, requirement, matches: [match({ assists: 25, deaths: 11 }), match({ match_id: 2, assists: 19, deaths: 0 })] }).isComplete).toBe(false);
  });

  it("sums daily support assists only across eligible wins inside the date window", () => {
    const requirement = finalRaceQuests("support")[3].requirement;
    const result = evaluateStarRaceRequirement({ ...window, requirement, matches: [
      match({ assists: 15 }), match({ match_id: 2, assists: 20, lobby_type: 0 }),
      match({ match_id: 3, assists: 50, radiant_win: false }),
      match({ match_id: 4, assists: 100, start_time: Date.parse("2026-10-20T12:00:00+03:00") / 1000 }),
    ] });
    expect(result).toMatchObject({ isComplete: true, progress: 35 });
    expect(result.wins.map(({ matchId }) => matchId)).toEqual(["1", "2"]);
  });
});
