import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DRAFT_SEQUENCE } from "./model/config";
import { FEARLESS_DRAFT_HEROES } from "./model/heroes";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
const teamPanel = source("app/fearless-draft/components/DraftTeamPanel.tsx");
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

  it("offers desktop fullscreen and highlights the latest pick or ban", () => {
    expect(activeDraft).toContain('role="switch"');
    expect(activeDraft).toContain("На полный экран");
    expect(interactions).toContain(".fearless-active-draft:fullscreen");
    expect(interactions).toContain("@media (max-width: 980px)");
    expect(heroGrid).toContain("just-${flashingAction.type.toLowerCase()}");
    expect(interactions).toContain("fearless-ban-flash");
    expect(interactions).toContain("fearless-pick-flash");
  });

  it("keeps picked hero images at their landscape ratio in fullscreen", () => {
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-pick-slots > div\s*\{[^}]*aspect-ratio:\s*16 \/ 9;/,
    );
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-pick-slots img\s*\{[^}]*object-fit:\s*contain;/,
    );
  });
});
