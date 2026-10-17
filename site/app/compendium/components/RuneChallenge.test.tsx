import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RuneChallenge } from "./RuneChallenge";
import { compendiumHeroById } from "../model/heroes";

it("preserves the live rune card, hero selection, completion and lock presentation", () => {
  const props = { currentTimeMs: 1_800_000_000_000, rewardStars: 1, resetCountdown: "12:00:00", onStarsChange: () => {} };
  const selection = { hero: compendiumHeroById(1), selectedAt: "2026-10-19T00:00:00Z", nextChangeAt: "2026-10-26T00:00:00Z", canChangeHero: true };
  const empty = renderToStaticMarkup(<RuneChallenge {...props} initialChallenge={{ hasAccess: true, accessRoleName: null, selection: null, completion: null }} />);
  expect(empty).toContain("compendium-rune-first-selection");
  expect(empty).toContain("Выбрать героя");
  const completed = renderToStaticMarkup(<RuneChallenge {...props} initialChallenge={{ hasAccess: true, accessRoleName: null, selection,
    completion: { matchedHeroId: 1, matchedMatchId: "123", completedAt: "2026-10-19T01:00:00Z", isManual: false } }} />);
  for (const text of ["compendium-rune-selected-hero", "Anti-Mage", "Испытание выполнено", "Матч 123", "12:00:00", "Сменить героя"]) expect(completed).toContain(text);
  const locked = renderToStaticMarkup(<RuneChallenge {...props} initialChallenge={{ hasAccess: false, accessRoleName: null, selection: null, completion: null }} />);
  expect(locked).toContain("Задание и выбор героя пока недоступны");
  expect(locked).not.toContain("compendium-rune-picker");
});
