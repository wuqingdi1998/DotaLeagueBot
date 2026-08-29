import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const screen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
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
  });

  it("renders thicker separated player frames and animated suggestion dashes", () => {
    expect(roster).toContain("draftTeamPlayerColor");
    expect(rosterStyles).toContain("border: 4px solid var(--fearless-player-color)");
    expect(rosterStyles).toContain("inset 0 0 0 2px var(--line-strong)");
    expect(suggestionStyles).toContain(".fearless-hero-suggestion-frame");
    expect(suggestionStyles).toContain("fearless-hero-suggestion-run");
    expect(suggestionStyles).toContain("--fearless-suggestion-angle");
    expect(heroGrid).toContain("suggestionRing(suggestionColors)");
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
