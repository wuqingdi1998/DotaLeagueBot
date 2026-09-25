import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { OctoberClanShowcase } from "../sections/OctoberClanShowcase";
import { OctoberClanOutingCard } from "../sections/OctoberClanOutingCard";
import { OctoberSectionNavigation } from "../components/OctoberSectionNavigation";
import { OCTOBER_CLANS } from "./clans";
import { OCTOBER_PREVIEW_SECTIONS } from "./sections";
import { octoberRewardsForStars } from "./rewards";
import { OCTOBER_RACE_EXCLUSION_RULES, octoberDailyQuestSamples } from "./preview";

function unavailable() {
  throw new Error("A private preview must never submit an action");
}

describe("October preview actions", () => {
  it("offers exactly four desktop screen links in the planned order", () => {
    const html = renderToStaticMarkup(<OctoberSectionNavigation />);
    expect(OCTOBER_PREVIEW_SECTIONS.map((section) => section.label)).toEqual([
      "Кланы", "Личный зачёт", "Гонка за звёздами", "Задания дня",
    ]);
    for (const section of OCTOBER_PREVIEW_SECTIONS) {
      expect(html).toContain(`href="#${section.id}"`);
      expect(html).toContain(`aria-label="${section.label}"`);
    }
    expect(html.match(/href="#october-section-/g)).toHaveLength(4);
  });

  it("shows the new five-step personal track without the old community tally", () => {
    const html = renderToStaticMarkup(
      <CompendiumRewards
        personalStars={0}
        communityStars={0}
        isPreview
        showCommunity={false}
        personalRewards={octoberRewardsForStars(0)}
      />,
    );
    expect(html).toContain("Личный зачёт");
    expect(html).not.toContain("Зачёт сообщества");
    expect(html).toContain("Бронзовый бейдж клана");
    expect(html).toContain("Золотой бейдж клана");
    expect(html).not.toContain("Платиновый бейдж клана");
    expect(html).not.toContain("Награды выберем позже");
    expect(html).not.toContain("TI 2026");
    expect(html).not.toContain("href=\"/compendium/leaderboard\"");
  });

  it("shows two original clan flags without changing the quest and race cards", () => {
    const html = renderToStaticMarkup(<OctoberClanShowcase />);
    expect(OCTOBER_CLANS.map((clan) => clan.name)).toEqual(["Морбус", "Панацея"]);
    expect(html).toContain("Флаг клана Морбус");
    expect(html).toContain("Флаг клана Панацея");
    expect(html).toContain("morbus-emblem-v2.webp");
    expect(html).toContain("panacea-emblem.webp");
    expect(html).toContain("три предмета");
    expect(html).not.toContain("Зачёт сообщества");
    expect(OCTOBER_RACE_EXCLUSION_RULES.every((rule) => rule.includes("личный зачёт и счёт клана")))
      .toBe(true);
  });

  it("gives both clanmates a star and permits the same match to close a hero quest", () => {
    const html = renderToStaticMarkup(<OctoberClanOutingCard />);
    expect(html).toContain("Клановая вылазка");
    expect(html).toContain("Выиграйте одну рейтинговую игру вместе с участником своего клана");
    expect(html).toContain("каждый получит по одной звезде");
    expect(html).toContain("одновременно засчитать для испытания 1 или 2");
    expect(html).toMatch(/class="compendium-check-button"[^>]*disabled/);
  });

  it("renders the existing daily card with disabled buttons", () => {
    const html = renderToStaticMarkup(
      <QuestCard
        quest={octoberDailyQuestSamples()[0]}
        rewardStars={1}
        isChecking={false}
        isRerolling={false}
        canCheck={false}
        hasReroll={false}
        canReroll={false}
        onCheck={unavailable}
        onReroll={unavailable}
        isPreview
      />,
    );
    expect(html).toContain("compendium-quest");
    expect(html).toContain("Пока не открыто");
    expect(html).toMatch(/class="compendium-reroll-button"[^>]*disabled/);
    expect(html).toMatch(/class="compendium-check-button"[^>]*disabled/);
  });

  it("renders the existing Rune card without a hero picker or check button", () => {
    const html = renderToStaticMarkup(
      <RuneChallenge
        initialChallenge={{
          hasAccess: false,
          accessRoleName: null,
          selection: null,
          completion: null,
        }}
        currentTimeMs={0}
        rewardStars={1}
        resetCountdown=""
        onStarsChange={unavailable}
        isPreview
      />,
    );
    expect(html).toContain("compendium-rune-challenge");
    expect(html).toContain("Испытание Рун");
    expect(html).not.toContain("compendium-rune-picker");
    expect(html).not.toContain("compendium-check-button");
  });
});
