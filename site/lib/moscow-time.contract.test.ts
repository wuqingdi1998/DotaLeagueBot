import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Moscow server time contract", () => {
  it("publishes server time to the tournament page", () => {
    const route = source("app/api/tournament/route.ts");
    const types = source("app/tournaments/[slug]/model/types.ts");
    expect(route).toContain("generatedAt: new Date().toISOString()");
    expect(types).toContain("generatedAt: string");
  });

  it("does not use the user's wall clock for tournament deadlines", () => {
    const controller = source(
      "app/tournaments/[slug]/hooks/useTournamentController.ts",
    );
    const checkIn = source(
      "app/tournaments/[slug]/hooks/useTournamentCheckIn.ts",
    );
    const registration = source(
      "app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
    );
    expect(controller).toContain("useServerClock(data?.generatedAt)");
    expect(controller).not.toContain("Date.now()");
    expect(checkIn).not.toContain("new Date()");
    expect(registration).not.toContain("Date.now()");
  });

  it("interprets organizer date fields as Moscow time", () => {
    const setup = source("app/setup/page.tsx");
    const matchPayload = source(
      "app/tournaments/[slug]/model/match-result-payload.ts",
    );
    const validation = source(
      "app/api/tournament/tournament-validation.ts",
    );
    expect(setup).not.toContain("new Date(form.start_at)");
    expect(matchPayload).not.toContain('new Date(text("scheduledAt"))');
    expect(validation).toContain("normalizeTournamentDateFields");
  });
});
