import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0087_season_lobby_rooms.sql",
);
const roomCommands = source(
  "../app/season-lobby/[matchId]/server/room-commands.ts",
);
const roomQuery = source(
  "../app/season-lobby/[matchId]/server/room-query.ts",
);
const transfer = source(
  "../app/season-lobby/[matchId]/server/captain-transfer.ts",
);
const hostAction = source(
  "../app/api/admin/season/season-lobby-host-actions.ts",
);
const lobbyDisplay = source(
  "../app/tournaments/[slug]/sections/SeasonLobbyDisplay.tsx",
);
const lobbyChat = source(
  "../app/season-lobby/[matchId]/components/LobbyChat.tsx",
);
const lobbyEntryStyles = source(
  "../app/styles/60-season-lobby-entry-and-shell.css",
);
const lobbyRoomStyles = source("../app/styles/61-season-lobby-chat.css");
const roomScreen = source(
  "../app/season-lobby/[matchId]/SeasonLobbyRoomScreen.tsx",
);
const roomPage = source("../app/season-lobby/[matchId]/page.tsx");
const organizerCaptainControls = source(
  "../app/season-lobby/[matchId]/components/OrganizerCaptainControls.tsx",
);
const seasonRoute = source("../app/api/season/route.ts");
const fearlessSnapshot = source(
  "../app/fearless-draft/server/snapshot-service.ts",
);

describe("season lobby room contract", () => {
  it("lets players and organizers enter while keeping public player access scoped", () => {
    expect(roomQuery).toContain("LEFT JOIN season_match_room_players viewer");
    expect(roomQuery).toContain("$3::boolean");
    expect(roomQuery).toContain("lobby_configuration_status = 'published'");
    expect(roomCommands).toContain("if (actor.isAdmin)");
    expect(roomCommands).toContain(
      "await participantSide(client, matchId, actor.discordId)",
    );
    expect(seasonRoute).toContain("$3::boolean OR EXISTS");
    expect(migration).toContain("VARCHAR(500)");
    expect(migration).toContain("season_match_room_players");
  });

  it("lets the assigned host or organizer start and checks all ten players", () => {
    expect(hostAction).toContain("participant.player_id = $2");
    expect(roomCommands).toContain(
      "room.host_player_id !== actor.discordId",
    );
    expect(roomCommands).toContain("counts.online_count !== 10");
    expect(roomCommands).toContain("is_force_started = $2");
    expect(lobbyDisplay).toContain("Войти в лобби");
  });

  it("supports organizer captain selection and hides the draft from organizers", () => {
    expect(roomCommands).toContain("startSeasonLobbyWithCaptains");
    expect(roomCommands).toContain("manualCaptain");
    expect(transfer).toContain("setSeasonLobbyCaptain");
    expect(organizerCaptainControls).toContain("START_WITH_CAPTAINS");
    expect(organizerCaptainControls).toContain("SET_CAPTAIN");
    expect(roomPage).toContain(
      '["drafting", "break"].includes(room.status) && !room.isOrganizer',
    );
    expect(roomScreen).toContain("!snapshot.isOrganizer && initialDraft?.series");
  });

  it("keeps the organizer host control left of the tier on one row", () => {
    const hostControl = lobbyDisplay.indexOf("participantAction?.(match, player)");
    const tier = lobbyDisplay.indexOf('className="player-tier"');

    expect(hostControl).toBeGreaterThan(-1);
    expect(hostControl).toBeLessThan(tier);
    expect(lobbyEntryStyles).toMatch(
      /\.season-temporary-team li > \.season-player-row-actions\s*{[^}]*display: inline-flex;/,
    );
  });

  it("keeps chat level with five players and groups consecutive messages", () => {
    expect(lobbyChat).toContain("previousMessage?.playerId === item.playerId");
    expect(lobbyChat).toContain("item.avatarUrl");
    expect(lobbyChat).toContain("!isContinuation");
    expect(lobbyRoomStyles).toContain(
      "grid-template-rows: auto minmax(0, 1fr) auto auto",
    );
    expect(lobbyRoomStyles).toContain("min-height: 0");
    expect(lobbyRoomStyles).toMatch(
      /\.season-room-chat\s*\{[\s\S]*?height: 0;[\s\S]*?min-height: 100%;/,
    );
    expect(lobbyRoomStyles).toMatch(
      /\.season-room-messages\s*\{[\s\S]*?overflow-y: auto;/,
    );
  });

  it("uses the compact lobby chat and synchronization labels", () => {
    expect(lobbyChat).toContain("<strong>Чат лобби</strong>");
    expect(lobbyChat).not.toContain("Только для этих 10 игроков");
    expect(roomScreen).not.toContain(
      "Здесь собираются только десять участников этого матча.",
    );
    expect(roomScreen).toContain("Синхронизация включена");
    expect(roomScreen).not.toContain("Связь активна");
  });

  it("requires every player to vote before creating the linked draft", () => {
    expect(roomCommands).toContain("counts.vote_count === 10");
    expect(roomCommands).toContain("chooseSeasonLobbyCaptain");
    expect(roomCommands).toContain("season_match_id");
    expect(migration).toContain("PRIMARY KEY (match_id, voter_player_id)");
  });

  it("keeps team viewers read-only and supports captain transfer", () => {
    expect(fearlessSnapshot).toContain("season_match_id = $3");
    expect(fearlessSnapshot).toContain(
      "loadSeries(client, user.discordId, options.seasonMatchId)",
    );
    expect(fearlessSnapshot).not.toContain("import { one, query, transaction }");
    expect(roomScreen).toContain("FearlessDraftScreen");
    expect(transfer).toContain("Передать полномочия может только действующий капитан");
    expect(transfer).toContain("UPDATE draft_maps SET");
    expect(transfer).toContain("UPDATE season_match_participants");
  });
});
