import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const applicationRoute = readFileSync(
  new URL("../app/api/applications/route.ts", import.meta.url),
  "utf8",
);
const applicationStatus = readFileSync(
  new URL(
    "../app/api/applications/application-status.ts",
    import.meta.url,
  ),
  "utf8",
);
const applicationFlow = `${applicationRoute}\n${applicationStatus}`;
const groupRoute = readFileSync(
  new URL("../app/api/admin/groups/route.ts", import.meta.url),
  "utf8",
);
const groupOperations = readFileSync(
  new URL(
    "../app/api/admin/groups/group-operations.ts",
    import.meta.url,
  ),
  "utf8",
);
const matchRoute = readFileSync(
  new URL("../app/api/admin/matches/route.ts", import.meta.url),
  "utf8",
);
const resultRoute = readFileSync(
  new URL("../app/api/admin/tournament-results/route.ts", import.meta.url),
  "utf8",
);

describe("complete tournament lifecycle", () => {
  it("requires a participant session to register a team", () => {
    expect(applicationRoute).toMatch(
      /export async function POST[\s\S]*requireSession\(\)/,
    );
  });

  it("serializes registrations so concurrent clicks cannot duplicate players", () => {
    expect(applicationFlow).toContain("pg_advisory_xact_lock");
    expect(applicationFlow).toMatch(
      /pg_advisory_xact_lock[\s\S]*PLAYER_ALREADY_IN_TEAM/,
    );
  });

  it("checks and reserves the final team slot in one protected operation", () => {
    expect(applicationStatus).toMatch(
      /transaction\(async \(client\)[\s\S]*status === "approved"[\s\S]*pg_advisory_xact_lock[\s\S]*TOURNAMENT_FULL[\s\S]*UPDATE tournament_team_applications/,
    );
    expect(applicationRoute).toContain("Все командные слоты уже заняты");
  });

  it("protects group generation, match results and final results with organizer access", () => {
    expect(groupRoute).toContain("requireAdmin()");
    expect(matchRoute).toContain("requireAdmin()");
    expect(resultRoute).toContain("requireAdmin()");
  });

  it("cannot attach teams from another tournament to a match", () => {
    expect(matchRoute).toContain("referencesBelongToTournament");
    expect(matchRoute).toContain(
      "body.tournamentId !== currentMatchRows[0].tournament_id",
    );
  });

  it("serializes forming and shuffling groups for the same tournament", () => {
    expect(
      groupOperations.match(/pg_advisory_xact_lock\(71004/g),
    ).toHaveLength(2);
  });
});
