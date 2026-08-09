import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  resolve(process.cwd(), "app/fearless-draft/server/series-service.ts"),
  "utf8",
);
const migration = readFileSync(
  resolve(process.cwd(), "../bot/database/migrations/0061_fearless_draft.sql"),
  "utf8",
);
const route = readFileSync(
  resolve(process.cwd(), "app/api/fearless-draft/route.ts"),
  "utf8",
);
const footer = readFileSync(
  resolve(process.cwd(), "app/tournaments/TournamentsHub.tsx"),
  "utf8",
);
const heroGrid = readFileSync(
  resolve(process.cwd(), "app/fearless-draft/components/HeroGrid.tsx"),
  "utf8",
);
const heroModel = readFileSync(
  resolve(process.cwd(), "app/fearless-draft/model/heroes.ts"),
  "utf8",
);

describe("Fearless Draft server safety contract", () => {
  it("locks the map and rejects stale double-click requests", () => {
    expect(service).toContain("FOR UPDATE");
    expect(service).toContain("map.version !== expectedVersion");
    expect(service).toContain("version = version + 1");
  });

  it("keeps one action per step and one use per hero at database level", () => {
    expect(migration).toContain("UNIQUE (map_id, step)");
    expect(migration).toContain("UNIQUE (map_id, hero_id)");
  });

  it("stores the server clock anchors instead of timer ticks", () => {
    expect(migration).toContain("step_started_at TIMESTAMPTZ");
    expect(migration).toContain("player1_reserve_seconds");
    expect(migration).not.toContain("timer_tick");
  });

  it("derives the acting player from the signed-in session", () => {
    expect(route).toContain("const user = await requireSession()");
    expect(route).toContain("selectDraftHero(\n          user.discordId");
    expect(route).not.toContain("command.playerId");
  });

  it("reuses the shared hero catalog and names the footer button Fearless Draft", () => {
    expect(heroGrid).toContain("FEARLESS_DRAFT_HEROES");
    expect(heroModel).toContain("COMPENDIUM_HEROES.map");
    expect(heroModel).toContain("disabledCaptainModeHeroIds");
    expect(footer).toContain(">\n            <FiCrosshair /> Fearless Draft");
    expect(footer).toContain('href="/fearless-draft"');
  });
});
