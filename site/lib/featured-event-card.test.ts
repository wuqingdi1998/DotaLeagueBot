import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const component = readFileSync(
  new URL("../app/tournaments/TournamentsHub.tsx", import.meta.url),
  "utf8",
);
const css = loadSiteStyles();

describe("featured event card", () => {
  it("shows the nearest-event label above the registration status", () => {
    expect(component).toMatch(
      /featured-event-heading[\s\S]*card-kicker">Ближайшее событие[\s\S]*TournamentStatusBadge/,
    );
  });

  it("keeps labels separated and safely wraps any tournament name", () => {
    expect(css).toMatch(
      /\.featured-event-heading\s*\{[^}]*flex-direction:\s*column;[^}]*gap:\s*12px;/,
    );
    expect(css).toMatch(
      /\.featured-event-card h2\s*\{[^}]*max-width:\s*100%;[^}]*hyphens:\s*auto;[^}]*overflow-wrap:\s*anywhere;/,
    );
  });
});
