import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { AuthUser } from "@/lib/auth";
import { seedSubstitutionMatch, substitutionTestDatabase, testTransaction } from "@/lib/testing/season-substitution-db";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
vi.mock("@/lib/season-final-awards", () => ({ syncSeasonFinalAwards: vi.fn() }));

import { createSeasonSubstitution, deleteSeasonSubstitution, updateSeasonSubstitution } from "./season-substitution-actions";
import { reportSeasonLobbyGameResult } from "@/app/season-lobby/[matchId]/server/game-result-service";
import { loadSeasonLobbyRoomSnapshot } from "@/app/season-lobby/[matchId]/server/room-query";
import { markReadyForNextDraftMap } from "@/app/fearless-draft/server/agreement-service";
import { toggleDraftHeroSuggestion } from "@/app/fearless-draft/server/suggestion-service";

let db: PGlite;
const substitution = { matchId: 10, gameNumber: 2, outgoingPlayerId: "10001", incomingPlayerId: "10011" };
const viewer = (discordId: string): AuthUser => ({
  discordId, dotaId: discordId, username: "Player", avatarUrl: null,
  playerName: "Player", realName: null, positions: null, serverName: "Player", isAdmin: false,
});
const finishFirstMap = () => reportSeasonLobbyGameResult(10, viewer("10001"), "8986462059", "a");
const firstRow = async (sql: string) => (await db.query(sql)).rows[0];

beforeAll(async () => { db = await substitutionTestDatabase(); }, 30_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await seedSubstitutionMatch(db);
  mocks.transaction.mockImplementation(testTransaction(db));
});

describe("live second-map substitutions", () => {
  it("waits for the host to report the first result and rolls back rejected substitutions", async () => {
    await expect(createSeasonSubstitution(substitution)).rejects.toMatchObject({ status: 409 });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_match_games")).toEqual({ count: 0 });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_penalty_events")).toEqual({ count: 0 });
    await expect(reportSeasonLobbyGameResult(10, viewer("10002"), "8986462059", "a"))
      .rejects.toMatchObject({ status: 403 });
  });

  it("admits the substitute between maps, transfers captain and host, and starts the next draft", async () => {
    await finishFirstMap();
    await markReadyForNextDraftMap("10006");
    await createSeasonSubstitution(substitution);
    expect(await firstRow("SELECT game_number, status, winner_side, dota_match_id FROM season_match_games WHERE game_number = 2"))
      .toEqual({ game_number: 2, status: "published", winner_side: null, dota_match_id: null });
    expect(await firstRow("SELECT fire_count FROM season_penalty_events")).toEqual({ fire_count: 5 });
    const room = await loadSeasonLobbyRoomSnapshot(viewer("10011"), 10);
    expect(room.status).toBe("break");
    expect(room.isHost).toBe(true);
    expect(room.currentUserTeamSide).toBe("a");
    expect(room.players).toHaveLength(10);
    expect(room.players.find((player) => player.playerId === "10011")?.isCaptain).toBe(true);
    await expect(loadSeasonLobbyRoomSnapshot(viewer("10001"), 10)).rejects.toMatchObject({ status: 403 });
    await expect(markReadyForNextDraftMap("10001")).rejects.toMatchObject({ status: 404 });
    await markReadyForNextDraftMap("10011");
    expect(await firstRow("SELECT current_map FROM draft_series")).toEqual({ current_map: 1 });
    await markReadyForNextDraftMap("10006");
    expect(await firstRow("SELECT current_map, player1_id::text, map1_coin_toss_winner_id::text FROM draft_series"))
      .toEqual({ current_map: 2, player1_id: "10011", map1_coin_toss_winner_id: "10011" });
    expect(await firstRow("SELECT first_chooser_id::text FROM draft_maps WHERE map_number = 2"))
      .toEqual({ first_chooser_id: "10006" });
    await db.exec("UPDATE draft_maps SET status = 'COMPLETE' WHERE map_number = 2; UPDATE season_match_rooms SET status = 'playing';");
    await reportSeasonLobbyGameResult(10, viewer("10011"), "8986555555", "b");
    expect(await firstRow("SELECT team_a_score, team_b_score, result, status FROM season_matches"))
      .toEqual({ team_a_score: 1, team_b_score: 1, result: "draw", status: "completed" });
    expect(await firstRow("SELECT game.game_number, game.dota_match_id, game.status FROM season_match_games game JOIN season_match_substitutions sub ON sub.game_id = game.id"))
      .toEqual({ game_number: 2, dota_match_id: "8986555555", status: "completed" });
  });

  it("allows a non-captain substitute to propose heroes and denies the replaced player", async () => {
    await finishFirstMap();
    await createSeasonSubstitution({ ...substitution, outgoingPlayerId: "10002" });
    await markReadyForNextDraftMap("10001");
    await markReadyForNextDraftMap("10006");
    await db.exec("UPDATE draft_series SET status = 'DRAFTING'; UPDATE draft_maps SET status = 'DRAFTING' WHERE map_number = 2;");
    await toggleDraftHeroSuggestion("10011", 1, 0, 10);
    expect(await firstRow("SELECT player_id::text, hero_id FROM draft_hero_suggestions"))
      .toEqual({ player_id: "10011", hero_id: 1 });
    await expect(toggleDraftHeroSuggestion("10002", 2, 0, 10)).rejects.toMatchObject({ status: 403 });
  });

  it("corrects and removes a substitution without doubling the penalty or losing the host", async () => {
    await finishFirstMap();
    const created = await createSeasonSubstitution(substitution);
    await updateSeasonSubstitution({ ...substitution, id: created.id, incomingPlayerId: "10012" });
    expect(await firstRow("SELECT fire_count FROM season_penalty_events")).toEqual({ fire_count: 5 });
    const room = await loadSeasonLobbyRoomSnapshot(viewer("10012"), 10);
    expect(room.isHost).toBe(true);
    await expect(loadSeasonLobbyRoomSnapshot(viewer("10011"), 10)).rejects.toMatchObject({ status: 403 });
    await deleteSeasonSubstitution({ id: created.id });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_penalty_events")).toEqual({ count: 0 });
    expect((await loadSeasonLobbyRoomSnapshot(viewer("10001"), 10)).isHost).toBe(true);
    await expect(loadSeasonLobbyRoomSnapshot(viewer("10012"), 10)).rejects.toMatchObject({ status: 403 });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_match_games WHERE game_number = 1 AND status = 'completed'"))
      .toEqual({ count: 1 });
  });

  it("rolls back the entire change when the incoming captain is busy in another draft", async () => {
    await finishFirstMap();
    await db.exec("INSERT INTO draft_series (player1_id, player2_id) VALUES (10011, 10012)");
    await expect(createSeasonSubstitution(substitution)).rejects.toMatchObject({ status: 409 });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_match_substitutions")).toEqual({ count: 0 });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_match_games WHERE game_number = 2")).toEqual({ count: 0 });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_penalty_events")).toEqual({ count: 0 });
    expect(await firstRow("SELECT host_player_id::text FROM season_matches")).toEqual({ host_player_id: "10001" });
  });

  it("retains the full-match substitution without a second-map penalty", async () => {
    await createSeasonSubstitution({ ...substitution, gameNumber: null });
    expect(await firstRow("SELECT technical_loss, game_id FROM season_match_substitutions"))
      .toEqual({ technical_loss: false, game_id: null });
    expect(await firstRow("SELECT count(*)::int AS count FROM season_penalty_events")).toEqual({ count: 0 });
    expect((await loadSeasonLobbyRoomSnapshot(viewer("10011"), 10)).players).toHaveLength(10);
  });

  it("keeps completed-match corrections from rewriting the historical draft", async () => {
    await finishFirstMap();
    await db.exec("UPDATE season_matches SET status = 'completed'; UPDATE season_match_rooms SET status = 'completed';");
    await createSeasonSubstitution(substitution);
    expect(await firstRow("SELECT player1_id::text FROM draft_series")).toEqual({ player1_id: "10001" });
    expect(await firstRow("SELECT host_player_id::text FROM season_matches")).toEqual({ host_player_id: "10001" });
  });

  it("rejects duplicate and wrong-map substitutions without additional penalties", async () => {
    await finishFirstMap();
    await createSeasonSubstitution(substitution);
    await expect(createSeasonSubstitution({ ...substitution, incomingPlayerId: "10012" }))
      .rejects.toMatchObject({ status: 409 });
    await expect(createSeasonSubstitution({ ...substitution, gameId: 1 }))
      .rejects.toMatchObject({ status: 400 });
    expect(await firstRow("SELECT fire_count FROM season_penalty_events")).toEqual({ fire_count: 5 });
  });
});
