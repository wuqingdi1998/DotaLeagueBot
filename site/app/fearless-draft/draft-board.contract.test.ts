import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DRAFT_SEQUENCE } from "./model/config";
import {
  FEARLESS_DRAFT_HEROES,
  sortHeroesAlphabetically,
} from "./model/heroes";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
const teamPanel = source("app/fearless-draft/components/DraftTeamPanel.tsx");
const board = source("app/styles/51-fearless-draft-board.css");
const interactions = source("app/styles/51-fearless-draft-interactions.css");

describe("Fearless Draft board interface", () => {
  it("reserves every pick and ban slot with its global draft step", () => {
    expect(DRAFT_SEQUENCE).toHaveLength(24);
    expect(teamPanel).toContain("draftSlots(priority, \"PICK\")");
    expect(teamPanel).toContain("draftSlots(priority, \"BAN\")");
    expect(teamPanel).toContain("fearless-slot-step");
  });

  it("uses dedicated vertical portraits and a full-name hover preview", () => {
    expect(FEARLESS_DRAFT_HEROES.every((hero) =>
      hero.portraitUrl.includes("variant=vertical"),
    )).toBe(true);
    expect(heroGrid).toContain("src={hero.portraitUrl}");
    expect(heroGrid).toContain('className="fearless-hero-preview"');
    expect(interactions).toContain("white-space: nowrap");
  });

  it("sorts heroes alphabetically inside every attribute group", () => {
    for (const attribute of ["strength", "agility", "intelligence", "universal"]) {
      const heroes = FEARLESS_DRAFT_HEROES
        .filter((hero) => hero.primaryAttribute === attribute);
      const sortedNames = sortHeroesAlphabetically(heroes).map((hero) => hero.name);
      expect(sortedNames).toEqual(heroes.map((hero) => hero.name)
        .sort((left, right) => left.localeCompare(right, "en")));
    }
    expect(heroGrid).toContain("heroes: sortHeroesAlphabetically(");
    expect(board).toContain("column-gap: clamp(18px, 1.7vw, 26px)");
    expect(board).toContain("flex: 0 0 8px");
  });

  it("offers desktop fullscreen and highlights the latest pick or ban", () => {
    expect(activeDraft).toContain('role="switch"');
    expect(activeDraft).toContain("На полный экран");
    expect(interactions).toContain(".fearless-active-draft:fullscreen");
    expect(interactions).toContain("@media (max-width: 980px)");
    expect(heroGrid).toContain("just-${flashingAction.type.toLowerCase()}");
    expect(interactions).toContain("fearless-ban-flash");
    expect(interactions).toContain("fearless-pick-flash");
    expect(heroGrid).toContain("LATEST_ACTION_FLASH_DURATION_MS = 3_000");
    expect(interactions).toContain("animation: fearless-ban-flash 3000ms");
    expect(interactions).toContain("animation: fearless-pick-flash 3000ms");
  });

  it("marks the current pick or ban slot for a white shimmer", () => {
    expect(activeDraft).toContain("currentStep={map.currentStep}");
    expect(teamPanel).toContain('isCurrentAction ? "current-action"');
    expect(interactions).toContain("@keyframes fearless-current-slot-shimmer");
    expect(interactions).toContain(".current-action::before");
  });

  it("keeps picked hero images at their landscape ratio in fullscreen", () => {
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-pick-slots > div\s*\{[^}]*aspect-ratio:\s*16 \/ 9;/,
    );
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-pick-slots img\s*\{[^}]*object-fit:\s*contain;/,
    );
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-ban-list > div\s*\{[^}]*aspect-ratio:\s*16 \/ 9;[^}]*height:\s*auto;/,
    );
  });

  it("keeps fullscreen controls in the right column after a map ends", () => {
    expect(interactions).toMatch(
      /\.fearless-draft-view-controls\s*\{[^}]*grid-column:\s*3;[^}]*justify-self:\s*end;/,
    );
  });
});
