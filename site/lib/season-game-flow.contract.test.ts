import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());
const source = (path: string) => readFileSync(join(root, path), "utf8");

describe("season game flow contract", () => {
  it("derives round status from the scheduled time and a three-hour window", () => {
    const migration = source(
      "../bot/database/migrations/0100_season_round_and_game_flow.sql",
    );
    expect(migration).toContain("CREATE OR REPLACE FUNCTION season_round_status_at");
    expect(migration).toContain("INTERVAL '3 hours'");
    expect(migration).toContain("stored_status_value = 'cancelled'");
  });

  it("requires a host result between draft maps", () => {
    const commands = source(
      "app/season-lobby/[matchId]/server/game-result-service.ts",
    );
    const agreement = source("app/fearless-draft/server/agreement-service.ts");
    expect(commands).toContain("room.status !== \"playing\"");
    expect(commands).toContain("room.host_player_id !== actorPlayerId");
    expect(commands).toContain("status = 'break'");
    expect(agreement).toContain("room.status !== \"break\"");
  });

  it("completes the match from both saved map winners", () => {
    const service = source(
      "app/season-lobby/[matchId]/server/game-result-service.ts",
    );
    expect(service).toContain("seasonSeriesScore");
    expect(service).toContain("team_a_score = $2");
    expect(service).toContain("status = 'completed'");
    expect(service).toContain("syncSeasonFinalAwards");
  });

  it("shows result controls only through the lobby room flow", () => {
    const screen = source(
      "app/season-lobby/[matchId]/SeasonLobbyRoomScreen.tsx",
    );
    const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
    expect(screen).toContain("<LobbyGameResult");
    expect(screen).toContain('["drafting", "break"].includes(snapshot.status)');
    expect(activeDraft).toContain("hasNextMap");
  });
});
