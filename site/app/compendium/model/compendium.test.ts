import { describe, expect, it } from "vitest";
import {
  COMPENDIUM_TOURNAMENT_START_AT,
  DAILY_HERO_COUNT,
} from "./constants";
import { COMPENDIUM_HEROES } from "./heroes";
import {
  findDistinctMatchingWins,
  findMatchingWin,
  matchEndedAt,
} from "./matches";
import {
  generateDailyQuestHeroes,
  generateBonusQuestHeroes,
  generateRerollQuestHeroes,
} from "./quests";
import {
  compendiumBadgeForStars,
  communityCompendiumRewards,
  dailyRerollsRemainingForProgress,
  personalCompendiumRewards,
} from "./rewards";
import {
  currentMoscowDay,
  moscowDateKey,
  tournamentCountdownLabel,
} from "./time";
import type { OpenDotaMatch } from "./types";

function match(input: Partial<OpenDotaMatch> = {}): OpenDotaMatch {
  return {
    match_id: 9001,
    player_slot: 0,
    radiant_win: true,
    duration: 1_800,
    game_mode: 22,
    lobby_type: 7,
    hero_id: 1,
    start_time: Date.parse("2026-08-01T08:00:00.000Z") / 1_000,
    ...input,
  };
}

const augustFirst = currentMoscowDay(new Date("2026-08-01T12:00:00.000Z"));

function matching(matches: OpenDotaMatch[], heroIds = [1]) {
  return findMatchingWin({
    matches,
    heroIds,
    dayStart: augustFirst.start,
    dayEnd: augustFirst.end,
    now: new Date("2026-08-01T18:00:00.000Z"),
  });
}

describe("daily compendium quest generation", () => {
  const quests = generateDailyQuestHeroes(COMPENDIUM_HEROES, () => 0.42);

  it("creates exactly three quests", () => {
    expect(quests).toHaveLength(3);
  });

  it("puts exactly six heroes in every quest", () => {
    expect(quests.every((quest) => quest.length === 6)).toBe(true);
  });

  it("uses eighteen different heroes across the day", () => {
    const ids = quests.flat().map((hero) => hero.id);
    expect(ids).toHaveLength(DAILY_HERO_COUNT);
    expect(new Set(ids)).toHaveLength(DAILY_HERO_COUNT);
  });

  it("sorts hero names alphabetically inside every quest", () => {
    for (const quest of quests) {
      const names = quest.map((hero) => hero.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    }
  });

  it("rejects a catalog that is too small", () => {
    expect(() => generateDailyQuestHeroes(COMPENDIUM_HEROES.slice(0, 17))).toThrow();
  });
});

describe("daily quest reroll", () => {
  it("creates six different heroes outside the original daily set", () => {
    const originalHeroIds = COMPENDIUM_HEROES.slice(0, 18).map((hero) => hero.id);
    const replacement = generateRerollQuestHeroes(
      originalHeroIds,
      COMPENDIUM_HEROES,
      () => 0.42,
    );

    expect(replacement).toHaveLength(6);
    expect(new Set(replacement.map((hero) => hero.id))).toHaveLength(6);
    expect(
      replacement.every((hero) => !originalHeroIds.includes(hero.id)),
    ).toBe(true);
    expect(replacement.map((hero) => hero.name)).toEqual(
      replacement.map((hero) => hero.name).sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    );
  });
});

describe("compendium personal rewards", () => {
  it("uses the shortened personal and community goal levels", () => {
    expect(personalCompendiumRewards.map((reward) => reward.stars)).toEqual([
      10, 20, 30, 40, 60,
    ]);
    expect(communityCompendiumRewards.map((reward) => reward.stars)).toEqual([
      100, 200, 300, 500, 700, 1000,
    ]);
  });

  it("creates a six-hero bonus quest outside the regular daily set", () => {
    const originalHeroIds = COMPENDIUM_HEROES.slice(0, 18).map((hero) => hero.id);
    const bonus = generateBonusQuestHeroes(
      originalHeroIds,
      COMPENDIUM_HEROES,
      () => 0.42,
    );
    expect(bonus).toHaveLength(6);
    expect(new Set(bonus.map((hero) => hero.id))).toHaveLength(6);
    expect(bonus.every((hero) => !originalHeroIds.includes(hero.id))).toBe(true);
  });

  it("selects the highest earned TI 2026 profile badge", () => {
    expect(compendiumBadgeForStars(9)).toBeNull();
    expect(compendiumBadgeForStars(10)).toBe("ti-2026-bronze");
    expect(compendiumBadgeForStars(30)).toBe("ti-2026-silver");
    expect(compendiumBadgeForStars(60)).toBe("ti-2026-gold");
  });

  it("grants three fresh rerolls when the 20th star is earned", () => {
    expect(dailyRerollsRemainingForProgress({
      totalStars: 19,
      usedCount: 1,
      thresholdReachedToday: false,
      usedBeforeThreshold: 0,
    })).toBe(0);
    expect(dailyRerollsRemainingForProgress({
      totalStars: 20,
      usedCount: 1,
      thresholdReachedToday: true,
      usedBeforeThreshold: 1,
    })).toBe(3);
  });
});

describe("Moscow calendar boundaries", () => {
  it("keeps the current set active until Moscow midnight", () => {
    expect(moscowDateKey(new Date("2026-08-01T20:59:59.999Z"))).toBe("2026-08-01");
  });

  it("switches to a new set at Moscow midnight", () => {
    expect(moscowDateKey(new Date("2026-08-01T21:00:00.000Z"))).toBe("2026-08-02");
  });

  it("uses Europe/Moscow midnight as the exact UTC day boundary", () => {
    expect(augustFirst.start.toISOString()).toBe("2026-07-31T21:00:00.000Z");
    expect(augustFirst.end.toISOString()).toBe("2026-08-01T21:00:00.000Z");
  });
});

describe("The International countdown", () => {
  it("counts down to 13 August 2026 at 07:00 Moscow time", () => {
    expect(new Date(COMPENDIUM_TOURNAMENT_START_AT).toISOString()).toBe(
      "2026-08-13T04:00:00.000Z",
    );
    expect(
      tournamentCountdownLabel(
        COMPENDIUM_TOURNAMENT_START_AT,
        new Date("2026-08-12T04:00:00.000Z"),
      ),
    ).toBe("1 дн. 00:00:00");
  });

  it("shows a finished state after the tournament starts", () => {
    expect(
      tournamentCountdownLabel(
        COMPENDIUM_TOURNAMENT_START_AT,
        new Date("2026-08-13T04:00:00.000Z"),
      ),
    ).toBe("Турнир начался");
  });
});

describe("OpenDota match qualification", () => {
  it("counts a ranked win today on an allowed hero", () => {
    expect(matching([match()])?.matchId).toBe("9001");
  });

  it("does not count a match from yesterday", () => {
    expect(matching([match({ start_time: Date.parse("2026-07-31T17:00:00Z") / 1_000 })])).toBeNull();
  });

  it("does not count a loss", () => {
    expect(matching([match({ radiant_win: false })])).toBeNull();
  });

  it("does not count an unranked lobby", () => {
    expect(matching([match({ lobby_type: 0 })])).toBeNull();
  });

  it("does not count an unsupported game mode", () => {
    expect(matching([match({ game_mode: 15 })])).toBeNull();
  });

  it("does not count a win on another hero", () => {
    expect(matching([match({ hero_id: 2 })])).toBeNull();
  });

  it("detects a Dire-side win from player_slot", () => {
    expect(matching([match({ player_slot: 128, radiant_win: false })])).not.toBeNull();
  });

  it("uses match end time instead of start time", () => {
    const crossingMidnight = match({
      start_time: Date.parse("2026-07-31T20:50:00Z") / 1_000,
      duration: 1_200,
    });
    expect(matchEndedAt(crossingMidnight).toISOString()).toBe("2026-07-31T21:10:00.000Z");
    expect(matching([crossingMidnight])).not.toBeNull();
  });

  it("does not count a match ending at next midnight", () => {
    expect(matching([match({
      start_time: Date.parse("2026-08-01T20:30:00Z") / 1_000,
      duration: 1_800,
    })])).toBeNull();
  });

  it("does not count a match that has not ended at check time", () => {
    expect(matching([match({ start_time: Date.parse("2026-08-01T17:50:00Z") / 1_000 })])).toBeNull();
  });

  it("requires wins on two different allowed heroes for the star race", () => {
    const firstHeroWin = match({ match_id: 9101, hero_id: 97 });
    const sameHeroWin = match({ match_id: 9102, hero_id: 97 });
    const secondHeroWin = match({ match_id: 9103, hero_id: 3 });
    const input = {
      heroIds: [97, 3, 112, 106, 109],
      requiredDistinctWins: 2,
      dayStart: augustFirst.start,
      dayEnd: augustFirst.end,
      now: new Date("2026-08-01T18:00:00.000Z"),
    };

    expect(findDistinctMatchingWins({
      ...input,
      matches: [firstHeroWin, sameHeroWin],
    })).toBeNull();
    expect(findDistinctMatchingWins({
      ...input,
      matches: [firstHeroWin, sameHeroWin, secondHeroWin],
    })?.map((win) => win.heroId)).toEqual([97, 3]);
  });
});
