import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const screen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
const suggestionBoards = source(
  "app/fearless-draft/components/HeroSuggestionBoards.tsx",
);
const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const roster = source("app/fearless-draft/components/DraftLobbyTeamStrip.tsx");
const suggestionService = source(
  "app/fearless-draft/server/suggestion-service.ts",
);
const snapshotService = source(
  "app/fearless-draft/server/snapshot-service.ts",
);
const seriesService = source(
  "app/fearless-draft/server/series-service.ts",
);
const route = source("app/api/fearless-draft/route.ts");
const suggestionStyles = source(
  "app/styles/51-fearless-draft-suggestions.css",
);
const rosterStyles = source(
  "app/styles/51-fearless-draft-lobby-roster.css",
);
const interactionStyles = source(
  "app/styles/51-fearless-draft-interactions.css",
);
const draftStyles = source("app/styles/50-fearless-draft.css");

describe("Fearless Draft teammate hero suggestions", () => {
  it("suppresses the native context menu across the draft interface", () => {
    expect(screen).toContain("onContextMenu={(event) => event.preventDefault()}");
  });

  it("toggles a server-backed suggestion from a hero right click", () => {
    expect(heroGrid).toContain('action: "TOGGLE_HERO_SUGGESTION"');
    expect(heroGrid).toContain("onContextMenu={(event) => {");
    expect(route).toContain('case "TOGGLE_HERO_SUGGESTION"');
    expect(route).toContain("toggleDraftHeroSuggestion");
  });

  it("limits each player to five and only returns their team suggestions", () => {
    expect(suggestionService).toContain("MAX_SUGGESTIONS_PER_PLAYER = 5");
    expect(suggestionService).toContain("draftLobbyTeamForCaptain");
    expect(suggestionService).toContain("player_id = ANY($2::bigint[])");
    expect(snapshotService).toContain("loadVisibleDraftHeroSuggestions");
    expect(suggestionService).toContain("playerName, colorSlot");
  });

  it("replaces the hero count with up to five named suggestion boards", () => {
    expect(heroGrid).toContain("<HeroSuggestionBoards");
    expect(heroGrid).not.toContain("text.heroPool");
    expect(heroGrid).not.toContain("visibleHeroes.length");
    expect(suggestionBoards).toContain("buildDraftHeroSuggestionBoards");
    expect(suggestionBoards).toContain("board.playerName");
    expect(suggestionBoards).toContain("FEARLESS_DRAFT_HEROES_BY_ID");
  });

  it("renders bright player frames without an inner separator", () => {
    expect(roster).toContain("draftTeamPlayerColor");
    expect(rosterStyles).toContain("border: 4px solid var(--fearless-player-color)");
    expect(rosterStyles).not.toContain("inset 0 0 0 2px var(--line-strong)");
  });

  it("renders uniform external suggestion dashes with a twelve-second lap", () => {
    expect(suggestionStyles).toContain(".fearless-hero-suggestion-frame");
    expect(suggestionStyles).toContain("fearless-hero-suggestion-run");
    expect(suggestionStyles).toContain("fearless-hero-suggestion-breathe");
    expect(suggestionStyles).toContain(
      "fearless-hero-suggestion-run 12000ms linear infinite",
    );
    expect(suggestionStyles).toContain(
      "fearless-hero-suggestion-breathe 4800ms ease-in-out infinite",
    );
    expect(suggestionStyles).toContain("inset: -2px");
    expect(suggestionStyles).toContain("stroke-dashoffset");
    expect(heroGrid).toContain("pathLength={SUGGESTION_PATH_LENGTH}");
    expect(heroGrid).toContain("strokeDasharray=");
    expect(heroGrid).not.toContain("conic-gradient");
    expect(interactionStyles).toMatch(
      /\.fearless-draft-stage:fullscreen \.fearless-attribute-group button\s*\{[^}]*overflow:\s*visible;/,
    );
  });

  it("synchronizes every suggestion animation to the shared server clock", () => {
    expect(activeDraft).toContain("serverNow={serverNow}");
    expect(heroGrid).toContain("useServerNow(serverNow");
    expect(heroGrid).toContain("--fearless-suggestion-run-delay");
    expect(heroGrid).toContain("--fearless-suggestion-breathe-delay");
    expect(suggestionStyles).toContain(
      "animation-delay: var(--fearless-suggestion-run-delay)",
    );
    expect(suggestionStyles).toContain(
      "animation-delay: var(--fearless-suggestion-breathe-delay)",
    );
  });

  it("keeps five boards beside a search field shortened to 220 pixels", () => {
    expect(suggestionStyles).toContain(".fearless-hero-suggestion-boards");
    expect(suggestionStyles).toContain("flex: 1 1 0");
    expect(suggestionStyles).toContain("width: min(220px, 34%)");
  });

  it("keeps Fearless Draft dark inside either site theme", () => {
    expect(draftStyles).toMatch(
      /\.fearless-draft-page\s*\{[^}]*color-scheme:\s*dark;[^}]*--bg:\s*#071827;[^}]*--surface:\s*#0d2434;[^}]*--text:\s*#f6fbff;/,
    );
  });

  it("clears a selected hero and every remaining suggestion at draft completion", () => {
    expect(seriesService).toContain(
      "DELETE FROM draft_hero_suggestions WHERE map_id = $1 AND hero_id = $2",
    );
    expect(seriesService).toContain(
      "DELETE FROM draft_hero_suggestions WHERE map_id = $1",
    );
  });
});
