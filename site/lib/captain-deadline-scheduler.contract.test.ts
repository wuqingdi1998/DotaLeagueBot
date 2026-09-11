import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const botJob = source("../../bot/cogs/season_lobby_deadlines.py");
const migration = source(
  "../../bot/database/migrations/0133_event_driven_scheduled_tasks.sql",
);
const route = source(
  "../app/api/internal/season/captain-deadlines/route.ts",
);
const service = source(
  "../app/season-lobby/[matchId]/server/captain-deadline-service.ts",
);

describe("captain selection deadline scheduler", () => {
  it("persists the deadline and wakes the shared scheduler on room changes", () => {
    expect(botJob).toContain("MIN(captain_stage_deadline_at)");
    expect(botJob).toContain("register_scheduled_job(bot, cog)");
    expect(migration).toContain("ON season_match_rooms");
  });

  it("advances expired stages through the protected site service", () => {
    expect(route).toContain("schedulerInternalAuthError");
    expect(route).toContain("advanceExpiredCaptainSelections");
    expect(service).toContain("captain_stage_deadline_at <= NOW()");
    expect(service).toContain("advanceCaptainSelection(client, stage.matchId)");
    expect(service).toContain("publishLiveUpdate(seasonLobbyChannel(stage.matchId))");
  });
});
