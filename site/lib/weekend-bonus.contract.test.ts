import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0054_compendium_weekend_bonus.sql",
);
const dashboard = source(
  "../app/compendium/sections/CompendiumDashboard.tsx",
);
const questCard = source("../app/compendium/components/QuestCard.tsx");
const runeChallenge = source(
  "../app/compendium/components/RuneChallenge.tsx",
);
const questRepository = source(
  "../app/compendium/services/repository.ts",
);
const runeRepository = source(
  "../app/compendium/services/rune-challenge-repository.ts",
);
const headingCss = source("../app/styles/35-compendium-heading.css");

describe("weekend bonus integration", () => {
  it("allows both ordinary and doubled rewards in persistent storage", () => {
    expect(migration.match(/CHECK \(reward_amount IN \(1, 2\)\)/g)).toHaveLength(2);
    expect(questRepository).toContain("input.rewardStars");
    expect(runeRepository).toContain("input.rewardStars");
    expect(runeRepository).toContain("matched_match_id, reward_amount");
  });

  it("shows the X2 notice only to the left of the daily reset timer", () => {
    const bonusPosition = dashboard.indexOf("compendium-weekend-bonus");
    const countdownPosition = dashboard.indexOf(
      "compendium-section-countdown",
      bonusPosition,
    );
    expect(bonusPosition).toBeGreaterThan(-1);
    expect(countdownPosition).toBeGreaterThan(bonusPosition);
    expect(dashboard.match(/Х2/g)).toHaveLength(1);
    expect(questCard).not.toContain("Х2");
    expect(runeChallenge).not.toContain("Х2");
    expect(headingCss).toContain(".compendium-weekend-bonus");
  });

  it("renders the calculated reward inside every eligible challenge card", () => {
    expect(questCard).toContain("<strong>{rewardStars}</strong>");
    expect(runeChallenge).toContain("<strong>{rewardStars}</strong>");
    expect(dashboard).toContain("quest.position <= 3");
  });
});
