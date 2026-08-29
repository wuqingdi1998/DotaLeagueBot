import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const routeStyles = source("../app/styles/tournaments-route.css");
const saveButtonStyles = source(
  "../app/styles/31-tournament-save-buttons.css",
);
const seasonAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonAdminPanel.tsx",
);
const seasonMatchAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonMatchAdmin.tsx",
);
const ordinaryMatchAdmin = source(
  "../app/tournaments/[slug]/admin/MatchResultsList.tsx",
);
const otherTournamentEditors = [
  "../app/tournaments/[slug]/ArchiveRosterEditor.tsx",
  "../app/tournaments/[slug]/TournamentContentEditor.tsx",
  "../app/tournaments/[slug]/admin/GroupSettingsEditor.tsx",
  "../app/tournaments/[slug]/admin/SeasonDisciplineAdmin.tsx",
  "../app/tournaments/[slug]/admin/SeasonFactsEditor.tsx",
  "../app/tournaments/[slug]/admin/TournamentDetailsEditor.tsx",
  "../app/tournaments/[slug]/admin/TournamentTeamsAdmin.tsx",
].map(source);

describe("tournament management save buttons", () => {
  it("marks ordinary and seasonal match, lobby and round save actions", () => {
    expect(ordinaryMatchAdmin).toContain("tournament-save-button");
    expect(
      seasonAdmin.match(/className="[^"]*tournament-save-button/g),
    ).toHaveLength(2);
    expect(
      seasonMatchAdmin.match(/className="[^"]*tournament-save-button/g),
    ).toHaveLength(2);
    for (const editor of otherTournamentEditors) {
      expect(editor).toContain("tournament-save-button");
    }
  });

  it("loads a bright green style with darker press feedback", () => {
    expect(routeStyles).toContain(
      '@import "./31-tournament-save-buttons.css";',
    );
    expect(saveButtonStyles).toMatch(
      /button\.tournament-save-button\s*\{[^}]*background:\s*#16b85f;/,
    );
    expect(saveButtonStyles).toMatch(
      /button\.tournament-save-button:active:not\(:disabled\)\s*\{[^}]*background:\s*#08743a;/,
    );
  });
});
