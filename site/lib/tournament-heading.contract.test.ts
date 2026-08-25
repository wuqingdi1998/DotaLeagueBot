import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tournamentHero = readFileSync(
  new URL(
    "../app/tournaments/[slug]/sections/TournamentHero.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("tournament heading status", () => {
  it("shows an active label instead of a zero-day countdown", () => {
    expect(tournamentHero).toContain('tournament.status === "active"');
    expect(tournamentHero).toContain("Турнир идёт");
  });
});
