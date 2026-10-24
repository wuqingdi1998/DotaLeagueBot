import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { seedSubstitutionMatch, substitutionTestDatabase, testTransaction } from "@/lib/testing/season-substitution-db";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);

import { hasActiveSeries, loadLockedDraftSeries, lockDraftPlayers } from "./database";
import { makeDraftChoice, settleExpiredDraftSeries, settleFinalPickReview } from "./series-service";
import { validateDraftActionTarget } from "./draft-context";
import { createSeasonLobbyDraft } from "@/app/season-lobby/[matchId]/server/captain-draft";

let database: PGlite;
let client: PoolClient;
const seasonTarget = { seriesId: 1, mapId: 1, seasonMatchId: 10 };
const trainingTarget = { seriesId: 2, mapId: 2 };

beforeAll(async () => {
  database = await substitutionTestDatabase();
  client = { query: async (sql: string, values?: unknown[]) => {
    const result = await database.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
  } } as PoolClient;
}, 30_000);
afterAll(async () => { await database.close(); });
beforeEach(async () => {
  await seedSubstitutionMatch(database);
  mocks.transaction.mockImplementation(testTransaction(database));
  await database.exec(`
    UPDATE draft_series SET status = 'CHOOSING';
    UPDATE draft_maps SET status = 'FIRST_DECISION', first_chooser_id = 10001;
    INSERT INTO draft_series (id, player1_id, player2_id, status, updated_at)
      VALUES (2, 10001, 9223372036854775806, 'CHOOSING', NOW() + INTERVAL '1 minute');
    INSERT INTO draft_maps (id, series_id, map_number, first_chooser_id)
      VALUES (2, 2, 1, 10001);
    SELECT setval('draft_series_id_seq', 2, true);
    SELECT setval('draft_maps_id_seq', 2, true);
  `);
});

describe("isolated training and official draft contexts", () => {
  it("starts the official draft while keeping a captain's existing training intact", async () => {
    await database.exec("DELETE FROM draft_series WHERE id = 1");
    await testTransaction(database)((locked) => createSeasonLobbyDraft(locked, 10, 2, {
      teamA: "10001", teamB: "10006",
    }));
    expect((await database.query("SELECT status FROM season_match_rooms WHERE match_id = 10")).rows)
      .toEqual([{ status: "drafting" }]);
    expect((await database.query("SELECT status, season_match_id FROM draft_series WHERE id = 2")).rows)
      .toEqual([{ status: "CHOOSING", season_match_id: null }]);
    expect((await database.query("SELECT count(*)::int AS count FROM draft_series WHERE season_match_id = 10")).rows)
      .toEqual([{ count: 1 }]);
  });

  it("does not treat a bot training with both preview flags false as an official conflict", async () => {
    await expect(hasActiveSeries(client, "10001", { seasonMatchId: 10 })).resolves.toBe(false);
    await expect(hasActiveSeries(client, "10001")).resolves.toBe(true);
    await database.exec(`
      INSERT INTO draft_series (id, season_match_id, player1_id, player2_id, status)
        VALUES (3, 11, 10001, 10012, 'CHOOSING');
    `);
    await expect(hasActiveSeries(client, "10001", { seasonMatchId: 10 })).resolves.toBe(true);
    await expect(hasActiveSeries(client, "10012")).resolves.toBe(false);
  });

  it("writes a choice only to the requested series even when the other series is newer", async () => {
    await makeDraftChoice("10001", "RADIANT", seasonTarget);
    const result = await database.query("SELECT id, first_choice FROM draft_maps ORDER BY id");
    expect(result.rows).toEqual([{ id: 1, first_choice: "RADIANT" }, { id: 2, first_choice: null }]);
    await makeDraftChoice("10001", "FIRST", trainingTarget);
    expect((await database.query("SELECT first_choice FROM draft_maps WHERE id = 2")).rows)
      .toEqual([{ first_choice: "FIRST" }]);
  });

  it("rejects missing identifiers, mismatched modes/maps and another player's series", async () => {
    expect(() => validateDraftActionTarget({ seriesId: 1 })).toThrow("серия или карта");
    await expect(loadLockedDraftSeries(client, "10001", { seriesId: 1, mapId: 1 }))
      .rejects.toMatchObject({ status: 409 });
    await expect(loadLockedDraftSeries(client, "10001", { ...seasonTarget, mapId: 2 }))
      .rejects.toMatchObject({ status: 409 });
    await expect(loadLockedDraftSeries(client, "10011", seasonTarget))
      .rejects.toMatchObject({ status: 403 });
    await expect(loadLockedDraftSeries(client, "10001", { ...trainingTarget, seasonMatchId: 10 }))
      .rejects.toMatchObject({ status: 409 });
  });

  it("does not revive abandoned drafts or advance their saved final-review timer", async () => {
    await database.exec(`
      UPDATE draft_series SET status = 'ABANDONED' WHERE id = 2;
      UPDATE draft_maps SET status = 'DRAFTING', first_pick_player_id = 10001,
        step_started_at = NOW() - INTERVAL '1 hour' WHERE id = 2;
    `);
    await expect(settleExpiredDraftSeries(2)).resolves.toBe(false);
    await database.exec(`UPDATE draft_maps SET status = 'FINAL_PICK_REVIEW',
      final_pick_review_ends_at = NOW() - INTERVAL '1 minute' WHERE id = 2`);
    await expect(settleFinalPickReview(2)).resolves.toBe(false);
    expect((await database.query("SELECT status FROM draft_series WHERE id = 2")).rows)
      .toEqual([{ status: "ABANDONED" }]);
  });

  it("rejects bot and human commands on an expired training before background cleanup", async () => {
    await database.exec("UPDATE draft_series SET last_human_action_at = NOW() - INTERVAL '1 hour' WHERE id = 2");
    await expect(makeDraftChoice("10001", "RADIANT", trainingTarget))
      .rejects.toMatchObject({ status: 409 });
    await expect(makeDraftChoice("9223372036854775806", "RADIANT", trainingTarget))
      .rejects.toMatchObject({ status: 409 });
  });

  it("serializes each scope independently in a deterministic player order", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const lockClient = { query } as unknown as PoolClient;
    await lockDraftPlayers(lockClient, ["10006", "10001", "10001"]);
    await lockDraftPlayers(lockClient, ["10001"], { seasonMatchId: 10 });
    expect(query.mock.calls.map((call) => call[1])).toEqual([
      ["fearless-draft:training:10001"], ["fearless-draft:training:10006"],
      ["fearless-draft:season:10001"],
    ]);
  });
});

it("preserves presence in two series when migrating the original player-only key", async () => {
  const presence = new PGlite();
  try {
    await presence.exec(`CREATE TABLE draft_presence (
      player_id bigint PRIMARY KEY, series_id bigint NOT NULL, heartbeat_at timestamptz DEFAULT NOW());
      INSERT INTO draft_presence(player_id, series_id) VALUES (10001, 1);`);
    await presence.exec(readFileSync(new URL(
      "../../../../bot/database/migrations/0188_fearless_draft_context_presence.sql", import.meta.url,
    ), "utf8"));
    await presence.exec("INSERT INTO draft_presence(player_id, series_id) VALUES (10001, 2)");
    expect((await presence.query("SELECT series_id FROM draft_presence ORDER BY series_id")).rows)
      .toEqual([{ series_id: 1 }, { series_id: 2 }]);
  } finally { await presence.close(); }
});
