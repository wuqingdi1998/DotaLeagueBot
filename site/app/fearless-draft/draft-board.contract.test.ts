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
const agreementPanel = source("app/fearless-draft/sections/DraftAgreementPanel.tsx");
const choices = source("app/fearless-draft/sections/DraftChoices.tsx");
const coinToss = source("app/fearless-draft/components/DraftCoinToss.tsx");
const draftScreen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const history = source("app/fearless-draft/sections/DraftHistory.tsx");
const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
const playerAvatar = source("app/fearless-draft/components/PlayerAvatar.tsx");
const teamPanel = source("app/fearless-draft/components/DraftTeamPanel.tsx");
const draftBase = source("app/styles/50-fearless-draft.css");
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
    expect(heroGrid).toContain("src={selectedHero.portraitUrl}");
    expect(heroGrid).not.toContain("src={selectedHero.imageUrl}");
    expect(heroGrid).toContain('className="fearless-hero-preview"');
    expect(interactions).toContain("white-space: nowrap");
    expect(board).toContain("aspect-ratio: 25 / 44");
    expect(interactions).toMatch(
      /\.fearless-hero-preview > span\s*\{[^}]*aspect-ratio:\s*25 \/ 44;/,
    );
    expect(heroGrid).toContain("const previewWidth = 150");
  });

  it("fits hero frames tightly to portraits without stretching them", () => {
    expect(board).toMatch(
      /\.fearless-attribute-group button\s*\{[^}]*padding:\s*0;/,
    );
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-attribute-group button\s*\{[^}]*width:\s*fit-content;[^}]*padding:\s*0;/,
    );
    expect(interactions).toContain("aspect-ratio: 25 / 44");
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
    expect(board).toContain("--fearless-attribute-gap: clamp(18px, 1.7vw, 26px)");
    expect(board).toContain("column-gap: var(--fearless-attribute-gap)");
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
    expect(interactions).toContain("0 0 68px 26px");
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

  it("moves next-map readiness into the centered top status area", () => {
    expect(activeDraft).toContain('className="fearless-map-ready-control"');
    expect(activeDraft).not.toContain('className="fearless-map-complete"');
    expect(board).toMatch(
      /\.fearless-map-ready-control\s*\{[^}]*grid-column:\s*2;[^}]*justify-content:\s*center;/,
    );
  });

  it("uses readable fullscreen labels and hides redundant online text", () => {
    expect(teamPanel).not.toContain('"В сети"');
    expect(interactions).toContain("font-size: 13px");
    expect(interactions).toMatch(
      /:fullscreen \.fearless-team-reserve\s*\{[^}]*gap:\s*10px;/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-team-reserve strong\s*\{[^}]*font-size:\s*28px;/,
    );
  });

  it("keeps reserve time beside its larger counter and gives turn text one size", () => {
    expect(board).toMatch(
      /\.fearless-team-reserve\s*\{[^}]*flex-direction:\s*row;[^}]*gap:\s*10px;/,
    );
    expect(board).toMatch(
      /\.fearless-team-reserve strong\s*\{[^}]*font-size:\s*26px;/,
    );
    expect(board).toMatch(
      /\.fearless-turn span,\s*\.fearless-turn strong\s*\{[^}]*font-size:\s*18px;/,
    );
  });

  it("keeps the non-fullscreen draft rectangle stable without empty space below heroes", () => {
    expect(board).toMatch(
      /\.fearless-hero-grid\s*\{[^}]*aspect-ratio:\s*9 \/ 4;[^}]*height:\s*auto;[^}]*max-height:\s*680px;/,
    );
    expect(interactions).toMatch(
      /\.fearless-active-draft:fullscreen \.fearless-hero-grid\s*\{[^}]*height:\s*auto;/,
    );
  });

  it("animates a thicker outline around the team making the current action", () => {
    expect(interactions).toContain("@keyframes fearless-current-team-flame");
    expect(interactions).toMatch(
      /\.fearless-team-panel\.current\s*\{[^}]*border-width:\s*2px;[^}]*animation:\s*fearless-current-team-flame/,
    );
  });

  it("counts end-request time from the synchronized server clock", () => {
    expect(draftScreen).toContain("serverNow={snapshot.serverNow}");
    expect(agreementPanel).toContain("useServerNow(serverNow, 1_000)");
    expect(agreementPanel).not.toContain("Date.now()");
  });

  it("keeps confirmation in the lower-right corner without adding a row", () => {
    expect(board).toMatch(
      /\.fearless-hero-pool\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*hidden;/,
    );
    expect(board).toMatch(
      /\.fearless-hero-confirm\s*\{[^}]*position:\s*absolute;[^}]*right:\s*10px;[^}]*bottom:\s*10px;/,
    );
  });

  it("opens an ordered history drawer from the fullscreen right wall", () => {
    expect(activeDraft).toContain('className="fearless-history-toggle"');
    expect(activeDraft).toContain("isHistoryOpen");
    expect(interactions).toContain(".fearless-history.drawer-open");
    expect(interactions).toMatch(
      /:fullscreen \.fearless-history-toggle\s*\{[^}]*bottom:\s*112px;/,
    );
    expect(history).not.toContain("[...actions].reverse()");
    expect(history).toContain("actions.map((action)");
  });

  it("highlights the pick or ban confirmation button on hover", () => {
    expect(interactions).toContain(".fearless-hero-confirm button:not(:disabled):hover");
    expect(interactions).toContain("filter: brightness(1.16) saturate(1.12)");
    expect(interactions).toContain(".fearless-hero-confirm button.pick:not(:disabled):hover");
    expect(interactions).toContain(".fearless-hero-confirm button.ban:not(:disabled):hover");
  });

  it("shows the selected hero only in the selecting player's current gray slot", () => {
    expect(activeDraft).toContain("localPreviewHeroId");
    expect(activeDraft).toContain("onPreviewHeroIdChange");
    expect(heroGrid).not.toContain('action: "PREVIEW_HERO"');
    expect(teamPanel).toContain("previewHeroId");
    expect(teamPanel).toContain('"previewing"');
    expect(interactions).toContain(".previewing img");
    expect(interactions).toContain("grayscale(1)");
  });

  it("keeps the confirm panel inside the universal hero column", () => {
    expect(board).toContain("--fearless-attribute-gap");
    expect(board).toContain(
      "width: calc((100% - 20px - var(--fearless-attribute-gap) - var(--fearless-attribute-gap) - var(--fearless-attribute-gap)) / 4)",
    );
    expect(interactions).toContain(
      "width: calc((100% - 16px - var(--fearless-attribute-gap) - var(--fearless-attribute-gap) - var(--fearless-attribute-gap)) / 4)",
    );
  });

  it("freezes animated captain avatars during the draft", () => {
    expect(teamPanel).toContain("freezeAnimation");
    expect(playerAvatar).toContain("staticAvatarUrl");
    expect(playerAvatar).toContain("freezeAnimation");
  });

  it("runs a server-synchronized ten-second spinner only on maps one and three", () => {
    expect(draftScreen).toContain("serverNow={snapshot.serverNow}");
    expect(choices).toContain("COIN_SPINNER_DURATION_MS");
    expect(choices).toContain("useServerNow(serverNow");
    expect(choices).toContain("На первой карте монетку проиграл");
    expect(choices).toContain("hasCoinToss &&");
    expect(coinToss).not.toContain("50 / 50");
    expect(draftBase).toContain("height: 88px");
  });
});
