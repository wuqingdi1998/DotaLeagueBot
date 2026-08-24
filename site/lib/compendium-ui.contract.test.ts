import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const compendiumPage = source("../app/compendium/page.tsx");
const compendiumCss = source("../app/styles/33-compendium.css");
const rewards = source("../app/compendium/components/CompendiumRewards.tsx");
const rewardsModel = source("../app/compendium/model/rewards.ts");
const rewardsCss = source("../app/styles/38-compendium-rewards.css");

describe("compendium interface contract", () => {
  it("opens the finished compendium results for every visitor", () => {
    expect(compendiumPage).toContain('redirect("/compendium/results")');
  });

  it("dims pending rewards and labels received ones", () => {
    for (const stars of [10, 20, 30, 40, 60]) {
      expect(rewardsModel).toContain(`stars: ${stars}`);
    }
    for (const stars of [100, 200, 300, 500, 700, 1000]) {
      expect(rewardsModel).toContain(`stars: ${stars}`);
    }
    expect(rewards).toContain("compendium-reward-marker");
    expect(rewardsCss).toContain("height: 33px");
    expect(rewards).toContain("compendium-milestone-unlocked");
    expect(rewards).toContain("получено");
    expect(rewards).toContain('isUnlocked ? "unlocked" : "locked"');
    expect(rewardsCss).toMatch(
      /\.compendium-reward-milestones article\.locked\s*\{[^}]*filter:[^;}]*brightness\(/,
    );
    expect(rewardsCss).toMatch(
      /\.compendium-milestone-topline\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*space-between;[^}]*gap:\s*12px;/,
    );
    expect(rewardsCss).toMatch(
      /\.compendium-milestone-unlocked\s*\{[^}]*position:\s*static;[^}]*flex:\s*0 0 auto;[^}]*padding:\s*4px 7px;[^}]*font-size:\s*9px;/,
    );
  });

  it("keeps the quest check button stable while verification is running", () => {
    expect(compendiumCss).toMatch(
      /\.compendium-check-button\s*\{[^}]*display:\s*inline-flex;[^}]*width:\s*100%;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/,
    );
    expect(compendiumCss).toMatch(
      /\.compendium-spinner\s*\{[^}]*flex:\s*0 0 auto;[^}]*margin:\s*0;/,
    );
  });

  it("makes reward milestones horizontally swipeable on phones", () => {
    expect(rewards).toContain("compendium-reward-swipe-hint");
    expect(rewards).toContain("Листайте награды влево и вправо");
    expect(rewardsCss).toMatch(
      /\.compendium-reward-swipe-hint\s*\{[^}]*display:\s*none;/,
    );
    expect(rewardsCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.compendium-reward-milestones,[\s\S]*\.compendium-reward-track-community \.compendium-reward-milestones\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*x mandatory;/,
    );
    expect(rewardsCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.compendium-reward-milestones article\s*\{[^}]*flex:\s*0 0 min\(calc\(100% - 28px\), 360px\);[^}]*scroll-snap-align:\s*start;/,
    );
    expect(rewardsCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.compendium-reward-swipe-hint\s*\{[^}]*display:\s*flex;/,
    );
    expect(rewardsCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.compendium-reward-milestones article\.unlocked\s*\{[^}]*box-shadow:\s*inset/,
    );
  });
});
