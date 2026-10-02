import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compendiumHeroById } from "@/app/compendium/model/heroes";
import { moscowDayBounds } from "@/app/compendium/model/time";
import {
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_COMPENDIUM_START_AT,
  OCTOBER_COMPENDIUM_WEEKS,
  octoberRaceForMoment,
} from "./plan";
import { octoberDailyQuestSamples, octoberRacePreviewData } from "./preview";

describe("October compendium draft", () => {
  it("covers every Moscow day from October 5 through October 25 without gaps", () => {
    expect(OCTOBER_COMPENDIUM_WEEKS).toHaveLength(3);
    expect(OCTOBER_COMPENDIUM_WEEKS[0].startsAt).toBe(OCTOBER_COMPENDIUM_START_AT);
    expect(OCTOBER_COMPENDIUM_WEEKS.at(-1)?.endsAt).toBe(OCTOBER_COMPENDIUM_END_AT);

    const dates = OCTOBER_COMPENDIUM_WEEKS.flatMap((week, weekIndex) => {
      if (weekIndex > 0) {
        expect(week.startsAt).toBe(OCTOBER_COMPENDIUM_WEEKS[weekIndex - 1].endsAt);
      }
      expect(week.quests).toHaveLength(7);
      return week.quests.map((quest) => {
        const bounds = moscowDayBounds(quest.dateKey);
        expect(bounds.start.getTime()).toBeGreaterThanOrEqual(Date.parse(week.startsAt));
        expect(bounds.end.getTime()).toBeLessThanOrEqual(Date.parse(week.endsAt));
        expect(quest.title).toBeTruthy();
        expect(quest.description).toBeTruthy();
        expect(quest.rewardStars).toBeGreaterThan(0);
        expect(quest.requirement).not.toBeNull();
        return quest.dateKey;
      });
    });
    expect(dates).toEqual(Array.from({ length: 21 }, (_, index) =>
      new Date(Date.UTC(2026, 9, 5 + index)).toISOString().slice(0, 10),
    ));
  });

  it("gives one month of Dota Plus to first place in races one and two only", () => {
    for (const week of OCTOBER_COMPENDIUM_WEEKS) {
      expect(week.prizes.map((prize) => prize.place)).toEqual([1, 2]);
      expect(week.prizes.every((prize) => prize.imageUrl === null)).toBe(true);
    }
    expect(OCTOBER_COMPENDIUM_WEEKS.map((week) => week.prizes[0].title)).toEqual([
      "1 месяц Dota+",
      "1 месяц Dota+",
      "Предмет выберем позже",
    ]);
  });

  it("uses hero IDs that exist in the shared Dota catalog", () => {
    for (const week of OCTOBER_COMPENDIUM_WEEKS) {
      for (const quest of week.quests) {
        const requirement = quest.requirement;
        if (requirement && "heroIds" in requirement && requirement.heroIds) {
          for (const heroId of requirement.heroIds) {
            expect(compendiumHeroById(heroId).id).toBe(heroId);
          }
        }
      }
    }
  });

  it("switches the preview at the exact start of each week", () => {
    expect(octoberRaceForMoment(new Date("2026-10-04T20:59:59.999Z")))
      .toBe(OCTOBER_COMPENDIUM_WEEKS[0]);
    expect(octoberRaceForMoment(new Date("2026-10-11T21:00:00.000Z")))
      .toBe(OCTOBER_COMPENDIUM_WEEKS[1]);
    expect(octoberRaceForMoment(new Date("2026-10-18T21:00:00.000Z")))
      .toBe(OCTOBER_COMPENDIUM_WEEKS[2]);
  });

  it("keeps both draft pages behind a server-side organizer check", () => {
    const preview = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
    const base = readFileSync(new URL("../base/page.tsx", import.meta.url), "utf8");
    for (const page of [preview, base]) {
      expect(page).toContain("await getSession()");
      expect(page).toContain("if (!user?.isAdmin) notFound()");
      expect(page.indexOf("if (!user?.isAdmin) notFound()"))
        .toBeLessThan(page.indexOf("loadOctoberClanMembers("));
      expect(page).toContain("viewerDiscordId={user.discordId}");
      expect(page).toContain("robots: { index: false, follow: false }");
      expect(page).not.toContain('"use client"');
    }
  });

  it("loads a current avatar for every clan standing row", () => {
    const service = readFileSync(
      new URL("../services/clan-members.ts", import.meta.url),
      "utf8",
    );
    expect(service).toContain("NULLIF(player.avatar_url, '')");
    expect(service).toContain("latest_session.discord_avatar_url");
    expect(service).toContain("avatarUrl: row.avatar_url");
  });

  it("keeps organizer preview controls in the profile menu instead of the compendium canvas", () => {
    const page = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
    const preview = readFileSync(
      new URL("../sections/OctoberCompendiumPreview.tsx", import.meta.url),
      "utf8",
    );
    const profileActions = readFileSync(
      new URL("../components/OctoberPreviewProfileActions.tsx", import.meta.url),
      "utf8",
    );
    expect(page).toContain("profileMenuExtras");
    expect(profileActions).toContain("Архив организатора");
    expect(profileActions).toContain("База компендиума");
    expect(profileActions).toContain("Показать 100 звёзд");
    expect(profileActions).toContain("Турнир стартовал");
    expect(page).toContain("isTournamentStarted");
    expect(page).toContain('phase: "published"');
    expect(preview).not.toContain("Архив организатора");
    expect(preview).not.toContain("compendium-base-floating-link");
    expect(preview).not.toContain("закрытый просмотр");
  });

  it("shows two illustrative hero quests before the clan outing", () => {
    const quests = octoberDailyQuestSamples();
    expect(quests).toHaveLength(2);
    expect(quests.map((quest) => quest.position)).toEqual([1, 2]);
    expect(quests.every((quest) => quest.heroes.length === 6 && quest.completion === null))
      .toBe(true);
    expect(new Set(quests.flatMap((quest) => quest.heroes.map((hero) => hero.id))).size)
      .toBe(12);
  });

  it("passes October races to the existing race display without active actions", () => {
    for (const week of OCTOBER_COMPENDIUM_WEEKS) {
      const preview = octoberRacePreviewData(week);
      expect(preview.isDetailsVisible).toBe(true);
      expect(preview.prizes).toHaveLength(2);
      expect(preview.quests.map((quest) => quest.dateKey))
        .toEqual(week.quests.map((quest) => quest.dateKey));
      expect(preview.quests.every((quest) =>
        quest.phase === "upcoming" && quest.completion === null && quest.progress === null,
      )).toBe(true);
    }
    const activityPreview = readFileSync(new URL("../sections/OctoberActivityPreview.tsx", import.meta.url), "utf8");
    expect(activityPreview).toContain("<CompendiumStarRace");
    expect(activityPreview).toContain("<QuestCard");
    expect(activityPreview).toContain("<RuneChallenge");
    expect(activityPreview).toContain("<OctoberClanOutingCard");
    expect(activityPreview).toContain("collapsibleRulesOnMobile");
    expect(activityPreview).toContain("isPreview");
  });
});
