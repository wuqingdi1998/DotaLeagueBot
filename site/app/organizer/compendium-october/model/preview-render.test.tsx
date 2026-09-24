import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { octoberDailyQuestSamples } from "./preview";

function unavailable() {
  throw new Error("A private preview must never submit an action");
}

describe("October preview actions", () => {
  it("uses the existing reward tracks without advertising old prizes", () => {
    const html = renderToStaticMarkup(
      <CompendiumRewards personalStars={0} communityStars={0} isPreview />,
    );
    expect(html).toContain("Личный зачёт");
    expect(html).toContain("Зачёт сообщества");
    expect(html).toContain("Награды выберем позже");
    expect(html).not.toContain("TI 2026");
    expect(html).not.toContain("href=\"/compendium/leaderboard\"");
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
