import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tournamentRoute = readFileSync(
  new URL("../app/api/tournament/route.ts", import.meta.url),
  "utf8",
);
const playerSearchRoute = readFileSync(
  new URL("../app/api/players/route.ts", import.meta.url),
  "utf8",
);

describe("public data minimization", () => {
  it("hides roster Discord ids from visitors outside that team", () => {
    expect(tournamentRoute).toContain("canSeeAllMemberIds");
    expect(tournamentRoute).toMatch(
      /discord_id:\s*canSeeAllMemberIds \|\| member\.player_id === viewer\?\.discordId[\s\S]*\? member\.player_id[\s\S]*: null/,
    );
  });

  it("does not expose Discord ids in nickname autocomplete", () => {
    expect(playerSearchRoute).not.toMatch(
      /SELECT\s+discord_id::text,\s*ingame_name/,
    );
  });
});
