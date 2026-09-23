import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { AuthUser } from "@/lib/auth";
import {
  seedSubstitutionMatch,
  substitutionTestDatabase,
  testTransaction,
} from "@/lib/testing/season-substitution-db";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);

import { sendSeasonLobbyMessage, startSeasonLobbyWithoutDraft } from "./room-commands";
import { loadSeasonLobbyRoomSnapshot } from "./room-query";

const host: AuthUser = {
  discordId: "10001",
  dotaId: "10101",
  username: "Host",
  avatarUrl: null,
  playerName: "Host",
  realName: null,
  positions: null,
  serverName: "Host",
  isAdmin: false,
  organizerAccess: null,
};

let database: PGlite;

beforeAll(async () => {
  database = await substitutionTestDatabase();
}, 30_000);
afterAll(async () => database.close());
beforeEach(async () => {
  await seedSubstitutionMatch(database);
  mocks.transaction.mockImplementation(testTransaction(database));
});

describe("standard close lobby", () => {
  it("closes the room and chat to participants when the tournament finishes or is archived", async () => {
    await loadSeasonLobbyRoomSnapshot(host, 10);
    await sendSeasonLobbyMessage(10, host, "До завершения");

    await database.exec("UPDATE tournaments SET status = 'finished' WHERE id = 40;");
    await expect(loadSeasonLobbyRoomSnapshot(host, 10)).rejects.toMatchObject({ status: 403 });
    await expect(sendSeasonLobbyMessage(10, host, "После завершения")).rejects.toMatchObject({ status: 403 });

    await database.exec("UPDATE tournaments SET status = 'archived' WHERE id = 40;");
    await expect(loadSeasonLobbyRoomSnapshot(host, 10)).rejects.toMatchObject({ status: 403 });
  });

  it("starts Captain's Mode directly without captain voting", async () => {
    await database.exec(`
      UPDATE tournaments SET format = 'Captain''s Mode' WHERE id = 40;
      INSERT INTO close_events (id, tournament_id) VALUES (1, 40);
      UPDATE season_match_rooms SET status = 'waiting' WHERE match_id = 10;
      DELETE FROM draft_maps;
      DELETE FROM draft_series;
    `);

    const waitingRoom = await loadSeasonLobbyRoomSnapshot(host, 10);
    expect(waitingRoom).toMatchObject({
      gameFormat: "Captain's Mode",
      usesFearlessDraft: false,
      status: "waiting",
    });

    await startSeasonLobbyWithoutDraft(10, host, true);

    const result = await database.query<{ status: string }>(
      "SELECT status FROM season_match_rooms WHERE match_id = 10",
    );
    expect(result.rows[0]).toEqual({ status: "playing" });
  });
});
