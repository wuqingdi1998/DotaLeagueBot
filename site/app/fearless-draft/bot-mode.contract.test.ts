import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const queue = source("app/fearless-draft/sections/DraftQueue.tsx");
const route = source("app/api/fearless-draft/route.ts");
const botService = source("app/fearless-draft/server/bot-service.ts");
const snapshot = source("app/fearless-draft/server/snapshot-service.ts");
const screen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const lobbyPreviewService = source(
  "app/fearless-draft/server/lobby-preview-service.ts",
);
const migration = source("../bot/database/migrations/0070_fearless_draft_bot_and_toss_segments.sql");
const lobbyPreviewMigration = source(
  "../bot/database/migrations/0097_fearless_draft_lobby_preview.sql",
);
const seasonLobbyPreviewMigration = source(
  "../bot/database/migrations/0141_fearless_draft_season_lobby_preview.sql",
);
const bot3Page = source("app/fearless-draft/bot3/SeasonLobbyBot3Screen.tsx");
const botMenuStyles = source("app/styles/50-fearless-draft-bot-menu.css");

describe("Fearless Draft bot mode", () => {
  it("offers one simulation menu to every signed-in player", () => {
    expect(queue).toContain('className="fearless-bot-menu"');
    expect(queue).toContain("text.botSimulation");
    expect(queue).not.toContain("snapshot.isOrganizer");
    expect(queue).toContain('{ action: "START_BOT" }');
    expect(queue).toContain("<FiCpu /> {text.bot}");
    expect(botMenuStyles).toContain(".fearless-bot-menu:hover");
    expect(botMenuStyles).toContain(".fearless-bot-menu[open]");
  });

  it("offers Bot2 as a tournament lobby preview", () => {
    expect(queue).toContain('{ action: "START_BOT2" }');
    expect(queue).toContain("<FiUsers /> {text.bot2}");
    expect(route).toContain('case "START_BOT2"');
    expect(route).toContain('await startBotDraft(user.discordId, "BO3", "lobby-preview")');
    expect(lobbyPreviewMigration).toContain("is_lobby_preview");
  });

  it("offers Bot3 as a full seasonal lobby preview", () => {
    expect(queue).toContain('{ action: "START_BOT3" }');
    expect(queue).toContain("<FiZap /> {text.bot3}");
    expect(route).toContain('case "START_BOT3"');
    expect(route).toContain(
      'await startBotDraft(user.discordId, "BO3", "season-lobby-preview")',
    );
    expect(seasonLobbyPreviewMigration).toContain("is_season_lobby_preview");
    expect(bot3Page).toContain("<LobbyPlayerTeams snapshot={room} />");
    expect(bot3Page).toContain("Все 10 игроков в сети");
  });

  it("allows every signed-in player to start all bot modes", () => {
    expect(route).toContain('case "START_BOT"');
    expect(route).not.toContain("if (!user.isAdmin)");
    expect(route).toContain("await startBotDraft(user.discordId)");
  });

  it("uses one hidden archived player without blocking another player's simulation", () => {
    expect(migration).toContain("9223372036854775806");
    expect(migration).toContain("is_archived");
    expect(botService).not.toContain(
      "hasActiveSeries(client, FEARLESS_DRAFT_BOT_PLAYER_ID)",
    );
    expect(botService).toContain(
      'respondToDraftSeriesEnd(FEARLESS_DRAFT_BOT_PLAYER_ID, "ACCEPT", playerId)',
    );
    expect(botService).toContain(
      "markReadyForNextDraftMap(FEARLESS_DRAFT_BOT_PLAYER_ID, playerId)",
    );
  });

  it("randomly resolves bot choices, picks and bans through normal draft rules", () => {
    expect(botService).toContain("randomAvailableHeroId");
    expect(botService).toMatch(
      /makeDraftChoice\(\s*FEARLESS_DRAFT_BOT_PLAYER_ID,[\s\S]*?playerId,/,
    );
    expect(botService).toContain("selectDraftHero(");
    expect(botService).toContain("state.version");
    expect(botService).toContain("true,");
    expect(botService).toContain("runBotAction");
    expect(route).toContain("await advanceBotDraft(user.discordId)");
  });

  it("instantly assigns the bot team's heroes in Bot3", () => {
    expect(botService).toContain('state.map_status === "LINEUP_ASSIGNMENT"');
    expect(botService).toContain("submitDraftLineupAssignment(");
    expect(route).toContain('"SUBMIT_LINEUP_ASSIGNMENT", "READY_FOR_NEXT_MAP"');
  });

  it("fills the preview with the organizer and nine stable real profiles", () => {
    expect(lobbyPreviewService).toContain("LIMIT 9");
    expect(lobbyPreviewService).toContain("player.is_archived = FALSE");
    expect(lobbyPreviewService).toContain("md5(player.discord_id::text || ':' || $2::text)");
    expect(lobbyPreviewService).toContain("buildLobbyPreviewRoster");
    expect(snapshot).toContain("loadLobbyPreviewPlayers");
    expect(snapshot).toContain("series?.isLobbyPreview");
    expect(screen).toContain("snapshot.lobbyPlayers");
  });
});
