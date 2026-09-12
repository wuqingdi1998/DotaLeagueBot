import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const tournamentPage = source(
  "../app/tournaments/[slug]/TournamentPageView.tsx",
);
const tournamentFooter = source(
  "../app/tournaments/[slug]/sections/TournamentFooter.tsx",
);
const tournamentStyles = [
  source("../app/styles/03-tournament-hero.css"),
  source("../app/styles/06-tournament-standings.css"),
  source("../app/styles/08-tournament-responsive.css"),
].join("\n");

describe("tournament footer", () => {
  it("keeps the compact site footer without the community promotion", () => {
    expect(tournamentPage).toContain("<TournamentFooter />");
    expect(tournamentFooter).toContain('<footer className="site-footer">');
    expect(tournamentFooter).toContain("<OrganizerArchiveLink");
    expect(tournamentFooter).toContain("<OrganizerAccess");
    expect(tournamentFooter).not.toContain("community-section");
    expect(tournamentFooter).not.toContain("Своя команда");
    expect(tournamentFooter).not.toContain("Открыть наш Discord");
  });

  it("removes styles used only by the deleted promotion", () => {
    expect(tournamentStyles).not.toContain(".community-section");
  });
});
