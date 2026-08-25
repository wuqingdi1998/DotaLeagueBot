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
  it("shows the countdown only before the exact tournament start", () => {
    expect(tournamentHero).toContain("hasTournamentStarted");
    expect(tournamentHero).not.toContain("Турнир идёт");
  });
});
