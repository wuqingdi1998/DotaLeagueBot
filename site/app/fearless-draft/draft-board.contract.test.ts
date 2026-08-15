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
const heroPortraitPreloader = source(
  "app/fearless-draft/components/HeroPortraitPreloader.tsx",
);
const draftScreen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const history = source("app/fearless-draft/sections/DraftHistory.tsx");
const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
const heroSearchHotkeys = source("app/fearless-draft/hooks/useHeroSearchHotkeys.ts");
const playerAvatar = source("app/fearless-draft/components/PlayerAvatar.tsx");
const fullscreenToggle = source(
  "app/fearless-draft/components/DraftFullscreenToggle.tsx",
);
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

  it("visually separates each team's bans into three draft phases", () => {
    const banSteps = (priority: "FIRST" | "SECOND") => DRAFT_SEQUENCE
      .flatMap((step, index) => step.actor === priority && step.type === "BAN"
        ? [index + 1]
        : []);

    expect(banSteps("FIRST")).toEqual([1, 4, 7, 10, 11, 19, 22]);
    expect(banSteps("SECOND")).toEqual([2, 3, 5, 6, 12, 20, 21]);
    expect(teamPanel).toContain('isPhaseStart ? "phase-start" : ""');
    expect(teamPanel).toContain("DRAFT_SEQUENCE[previousBanStep].phase !== DRAFT_SEQUENCE[step].phase");
    expect(board).toContain(".fearless-ban-list > div.phase-start { margin-left: 12px; }");
  });

  it("uses dedicated vertical portraits and a full-name hover preview", () => {
    expect(FEARLESS_DRAFT_HEROES.every((hero) =>
      hero.portraitUrl.includes("variant=vertical"),
    )).toBe(true);
    expect(heroGrid).toContain("src={hero.portraitUrl}");
    expect(heroGrid).toContain("src={selectedHero.portraitUrl}");
    expect(heroGrid).toContain("src={selectedHero.imageUrl}");
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
      /\.fearless-draft-stage:fullscreen \.fearless-attribute-group button\s*\{[^}]*width:\s*100%;[^}]*padding:\s*0;/,
    );
    expect(interactions).toContain("aspect-ratio: 25 / 44");
  });

  it("keeps portrait corners parallel to the hero card border", () => {
    expect(board).toMatch(
      /\.fearless-attribute-group button\s*\{[^}]*--fearless-hero-card-radius:\s*7px;[^}]*border:\s*1px solid transparent;[^}]*border-radius:\s*var\(--fearless-hero-card-radius\);/,
    );
    expect(board).toMatch(
      /\.fearless-hero-image\s*\{[^}]*border-radius:\s*calc\(var\(--fearless-hero-card-radius\) - 1px\);/,
    );
  });

  it("sorts heroes alphabetically inside every attribute group", () => {
    for (const attribute of ["strength", "agility", "intelligence", "universal"]) {
      const heroes = FEARLESS_DRAFT_HEROES
        .filter((hero) => hero.primaryAttribute === attribute);
      const sortedNames = sortHeroesAlphabetically(heroes).map((hero) => hero.name);
      expect(sortedNames).toEqual(heroes.map((hero) => hero.name)
        .sort((left, right) => left.localeCompare(right, "en")));
    }
    expect(heroGrid).toContain("const heroes = sortHeroesAlphabetically(");
    expect(board).toContain("--fearless-attribute-gap: clamp(18px, 1.7vw, 26px)");
    expect(board).toContain("column-gap: var(--fearless-attribute-gap)");
    expect(board).toContain("flex: 0 0 8px");
  });

  it("offers desktop fullscreen and highlights the latest pick or ban", () => {
    expect(fullscreenToggle).toContain('role="switch"');
    expect(draftScreen).toContain("useDraftFullscreen");
    expect(draftScreen).toContain('className="fearless-draft-stage"');
    expect(interactions).toContain(".fearless-draft-stage:fullscreen");
    expect(choices).toContain("<DraftFullscreenToggle");
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

  it("uses solid borders for every slot in the upper pick row", () => {
    expect(board).toMatch(
      /\.fearless-pick-slots > div\s*\{[^}]*border:\s*1px solid var\(--line\);/,
    );
  });

  it("keeps picked hero images at their landscape ratio in fullscreen", () => {
    expect(interactions).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-pick-slots > div\s*\{[^}]*aspect-ratio:\s*16 \/ 9;/,
    );
    expect(interactions).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-pick-slots img\s*\{[^}]*object-fit:\s*contain;/,
    );
    expect(interactions).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-ban-list > div\s*\{[^}]*aspect-ratio:\s*16 \/ 9;[^}]*height:\s*auto;/,
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

  it("matches reserve typography to the upper clock and keeps player headers aligned", () => {
    expect(teamPanel).toContain("isConnected ? text.online : text.opponentDisconnected");
    expect(teamPanel).toContain('className={isConnected ? undefined : "disconnected"}');
    expect(interactions).toContain("font-size: 28px");
    expect(interactions).toMatch(
      /:fullscreen \.fearless-team-reserve\s*\{[^}]*gap:\s*10px;/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-team-panel > header \.fearless-team-reserve strong\s*\{[^}]*font-size:\s*28px;/,
    );
  });

  it("uses the upper clock sizes for Reserve and its counter in both modes", () => {
    expect(board).toMatch(
      /\.fearless-team-reserve\s*\{[^}]*flex-direction:\s*row;[^}]*gap:\s*10px;[^}]*margin-right:\s*12px;/,
    );
    expect(board).toMatch(
      /\.fearless-team-panel > header \.fearless-team-reserve span\s*\{[^}]*font-size:\s*28px;/,
    );
    expect(board).toMatch(
      /\.fearless-team-panel > header \.fearless-team-reserve strong\s*\{[^}]*font-size:\s*28px;/,
    );
    expect(board).toMatch(
      /\.fearless-turn span,\s*\.fearless-turn strong\s*\{[^}]*font-size:\s*22px;/,
    );
  });

  it("keeps the non-fullscreen draft rectangle stable without empty space below heroes", () => {
    expect(board).toMatch(
      /\.fearless-hero-grid\s*\{[^}]*aspect-ratio:\s*auto;[^}]*height:\s*auto;[^}]*max-height:\s*680px;/,
    );
    expect(board).toMatch(
      /\.fearless-history\s*\{[^}]*align-self:\s*stretch;[^}]*contain:\s*size;/,
    );
    expect(interactions).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-hero-grid\s*\{[^}]*height:\s*auto;[^}]*flex:\s*0 0 auto;/,
    );
  });

  it("keeps the hero pool geometry fixed while search filters the visible cards", () => {
    expect(heroGrid).toContain("emptySlotCount");
    expect(heroGrid).toContain('className="fearless-hero-grid-placeholder"');
    expect(interactions).toMatch(
      /\.fearless-hero-grid-placeholder\s*\{[^}]*aspect-ratio:\s*25 \/ 44;[^}]*visibility:\s*hidden;/,
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

  it("keeps ordered history visible in the fullscreen right column", () => {
    expect(activeDraft).not.toContain('className="fearless-history-toggle"');
    expect(activeDraft).not.toContain("isHistoryOpen");
    expect(interactions).toMatch(
      /:fullscreen \.fearless-draft-workspace\s*\{[^}]*width:\s*100%;[^}]*grid-template-columns:\s*minmax\(0, 1540px\) minmax\(260px, 1fr\);/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-history\s*\{[^}]*display:\s*flex;[^}]*align-self:\s*stretch;/,
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
    expect(heroGrid).toContain('action: "HIGHLIGHT_HERO"');
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
      "width: calc(((var(--fearless-fullscreen-grid-width) - 16px - var(--fearless-attribute-gap) - var(--fearless-attribute-gap) - var(--fearless-attribute-gap)) / 4) - 18px)",
    );
  });

  it("turns the fullscreen confirmation into a landscape hero button", () => {
    expect(heroGrid).toContain("src={selectedHero.imageUrl}");
    expect(heroGrid).toContain('className="fearless-hero-confirm-image"');
    expect(heroGrid).toContain('className="fearless-hero-confirm-action"');
    expect(interactions).toMatch(
      /:fullscreen \.fearless-hero-confirm button\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*hidden;/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-hero-confirm\s*\{[^}]*aspect-ratio:\s*16 \/ 9;[^}]*min-height:\s*0;/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-hero-confirm-image\s*\{[^}]*display:\s*block;[^}]*object-fit:\s*contain;/,
    );
    expect(interactions).toMatch(
      /button\.ban \.fearless-hero-confirm-action\s*\{[^}]*background:\s*#b93e52;/,
    );
    expect(interactions).toMatch(
      /button\.pick \.fearless-hero-confirm-action\s*\{[^}]*background:\s*#159b65;/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-hero-confirm-action\s*\{[^}]*padding:\s*7px 12px;[^}]*font-size:\s*16px;/,
    );
  });

  it("halves the fullscreen draft step badge area", () => {
    expect(interactions).toMatch(
      /:fullscreen \.fearless-slot-step\s*\{[^}]*min-width:\s*30px;[^}]*height:\s*30px;[^}]*font-size:\s*14px;/,
    );
    expect(interactions).toMatch(
      /:fullscreen \.fearless-ban-list \.fearless-slot-step\s*\{[^}]*min-width:\s*24px;[^}]*height:\s*24px;[^}]*font-size:\s*12px;/,
    );
  });

  it("sends physical letter keys to hero search in English", () => {
    expect(heroGrid).toContain("useHeroSearchHotkeys");
    expect(heroGrid).toContain("ref={searchInputRef}");
    expect(heroSearchHotkeys).toContain('event.code.match(/^Key([A-Z])$/)');
    expect(heroSearchHotkeys).toContain("event.preventDefault()");
    expect(heroSearchHotkeys).toContain("searchInputRef.current?.focus()");
    expect(heroSearchHotkeys).toContain("onSearchLetter()");
    expect(heroGrid).toContain("setHeroPreview(null)");
  });

  it("keeps skipped bans blank outside the ordered history", () => {
    expect(teamPanel).not.toContain("<b>—</b>");
    expect(history).toContain("<i>—</i>");
  });

  it("shows a large player avatar in fullscreen team headers", () => {
    expect(interactions).not.toContain(":fullscreen .fearless-player-avatar { display: none; }");
    expect(interactions).toMatch(
      /:fullscreen \.fearless-team-panel > header \.fearless-player-avatar\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;[^}]*flex-basis:\s*64px;/,
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
    expect(choices).toContain("text.mapTwoChoiceBefore");
    expect(choices).toContain("hasCoinToss &&");
    expect(coinToss).not.toContain("50 / 50");
    expect(coinToss).toContain("coinTossAngleDegrees(segment)");
    expect(draftBase).not.toContain(".fearless-wheel-spinner b::before");
    expect(draftBase).toMatch(
      /\.fearless-wheel-spinner b\s*\{[^}]*clip-path:\s*polygon\(50% 0, 78% 8%, 100% 100%, 0 100%, 22% 8%\);/,
    );
    expect(draftBase).toContain("var(--fearless-spinner-angle)");
    expect(draftBase).toContain("height: 88px");
  });

  it("keeps the spinner's central mounting hub stationary", () => {
    expect(coinToss).toContain('className="fearless-wheel-spinner-hub"');
    expect(draftBase).not.toContain(".fearless-wheel-spinner::after");
    expect(draftBase).toContain(".fearless-wheel-spinner-hub");
    expect(draftBase).toMatch(
      /\.fearless-wheel-spinner-hub\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*3;/,
    );
  });

  it("preloads every vertical hero portrait while the toss screen is visible", () => {
    expect(choices).toContain("<HeroPortraitPreloader />");
    expect(heroPortraitPreloader).toContain("FEARLESS_DRAFT_HERO_PORTRAIT_URLS");
    expect(heroPortraitPreloader).toContain('startMode="immediate"');
  });
});
