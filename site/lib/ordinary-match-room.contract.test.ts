import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../../bot/database/migrations/0136_ordinary_match_rooms.sql");
const access = source("../app/match-room/[matchId]/server/room-access.ts");
const results = source("../app/match-room/[matchId]/server/result-service.ts");
const screen = source("../app/match-room/[matchId]/MatchRoomScreen.tsx");
const resultControl = source(
  "../app/match-room/[matchId]/components/MatchResultControl.tsx",
);
const organizerControls = source(
  "../app/match-room/[matchId]/components/OrganizerResultControls.tsx",
);
const matches = source("../app/tournaments/[slug]/sections/MatchesPanel.tsx");
const tournamentApi = source("../app/api/tournament/route.ts");
const tournamentCreate = source("../app/api/tournament/tournament-create.ts");

describe("ordinary match room contract", () => {
  it("enables rooms for future ordinary tournaments and CD FASTCUP #7", () => {
    expect(migration).toContain("ordinary_match_rooms_enabled");
    expect(migration).toContain("SET DEFAULT TRUE");
    expect(migration).toContain("slug = 'cd-fastcup-7'");
    expect(tournamentCreate).toContain('tournamentType === "ordinary"');
  });

  it("admits only the two captains and an organizer", () => {
    expect(access).toContain("captain_discord_id");
    expect(access).toContain("actor.isAdmin");
    expect(access).toContain("ordinary_match_rooms_enabled = TRUE");
    expect(tournamentApi).toContain("room_url");
    expect(matches).toContain("Войти в комнату");
  });

  it("creates a dispute on disagreement and lets only an organizer resolve it", () => {
    expect(results).toContain('evaluation === "disputed"');
    expect(results).toContain("Разрешить спор может только организатор");
    expect(resultControl).toContain("Организатор рассматривает спор");
    expect(organizerControls).toContain("SET_GAME_RESULT");
  });

  it("lets an organizer submit without a dispute and edit completed maps", () => {
    expect(results).toContain("setMatchRoomGameByOrganizer");
    expect(results).toContain("editMatchRoomGameByOrganizer");
    expect(organizerControls).toContain("Зафиксировать без подтверждений капитанов");
    expect(organizerControls).toContain("EDIT_GAME_RESULT");
    expect(organizerControls).toContain("Исправить карту");
  });

  it("stores agreed maps and automatically updates the series score", () => {
    expect(results).toContain("ordinary_match_games");
    expect(results).toContain("team_a_score = $2");
    expect(results).toContain("team_b_score = $3");
    expect(results).toContain("status = $2::varchar(16)");
    expect(screen).not.toContain("FearlessDraftScreen");
  });
});
