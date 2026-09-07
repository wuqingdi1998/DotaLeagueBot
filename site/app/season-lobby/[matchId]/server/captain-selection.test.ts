import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  seedSubstitutionMatch,
  substitutionTestDatabase,
  testTransaction,
} from "@/lib/testing/season-substitution-db";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  createSeasonLobbyDraft: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));
vi.mock("./captain-draft", () => ({
  createSeasonLobbyDraft: mocks.createSeasonLobbyDraft,
}));

import {
  answerCaptainInterest,
  startSeasonLobbyCaptainSelection,
  voteForSeasonLobbyCaptain,
  voteForSeasonLobbyCaptainTiebreak,
} from "./captain-selection-actions";
import { advanceCaptainSelection } from "./captain-selection";

let db: PGlite;
const organizer = { discordId: "99999", isAdmin: true };

async function roomState() {
  return (await db.query<{
    status: string;
    deadline_seconds: number;
    team_b_captain_id: string | null;
  }>(
    `SELECT status,
       EXTRACT(EPOCH FROM captain_stage_deadline_at - NOW())::int
         AS deadline_seconds,
       team_b_captain_id::text
     FROM season_match_rooms WHERE match_id = 10`,
  )).rows[0];
}

beforeAll(async () => {
  db = await substitutionTestDatabase();
}, 30_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await seedSubstitutionMatch(db);
  await db.exec(`
    UPDATE season_match_rooms SET status = 'waiting',
      team_a_captain_id = NULL, team_b_captain_id = NULL;
    UPDATE season_match_participants SET is_captain = FALSE;
  `);
  mocks.transaction.mockImplementation(testTransaction(db));
  mocks.createSeasonLobbyDraft.mockReset();
});

describe("three-stage captain selection workflow", () => {
  it("turns missing interest answers into no and selects the highest tiers", async () => {
    await db.exec(`
      UPDATE season_match_participants
      SET tier_snapshot = CASE
        WHEN player_id IN (10005, 10010) THEN 9
        ELSE 5
      END;
    `);
    await startSeasonLobbyCaptainSelection(10, organizer, true);
    await db.exec(`
      UPDATE season_match_rooms
      SET captain_stage_deadline_at = NOW() - INTERVAL '1 second';
    `);

    await testTransaction(db)((client) => advanceCaptainSelection(client, 10));

    const preferences = await db.query<{ count: number; yes_count: number }>(
      `SELECT COUNT(*)::int AS count,
         COUNT(*) FILTER (WHERE wants_to_be_captain)::int AS yes_count
       FROM season_match_captain_preferences`,
    );
    expect(preferences.rows[0]).toEqual({ count: 10, yes_count: 0 });
    expect(mocks.createSeasonLobbyDraft).toHaveBeenCalledWith(
      expect.anything(),
      10,
      2,
      { teamA: "10005", teamB: "10010" },
    );
  });

  it("moves from interest to voting and then to the special tiebreak", async () => {
    await startSeasonLobbyCaptainSelection(10, organizer, true);
    expect((await roomState()).status).toBe("captain_interest");
    expect((await roomState()).deadline_seconds).toBeGreaterThanOrEqual(59);

    const volunteers = new Set(["10001", "10002", "10003", "10006"]);
    for (let id = 10001; id <= 10010; id += 1) {
      await answerCaptainInterest(10, String(id), volunteers.has(String(id)));
    }

    expect(await roomState()).toMatchObject({
      status: "captain_voting",
      team_b_captain_id: "10006",
    });
    const automaticVotes = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM season_match_captain_votes WHERE is_automatic",
    );
    expect(automaticVotes.rows[0].count).toBe(4);

    await voteForSeasonLobbyCaptain(10, "10004", "10001");
    await voteForSeasonLobbyCaptain(10, "10005", "10002");
    expect((await roomState()).status).toBe("captain_tiebreak");

    const tiebreak = (await db.query<{
      voter_player_id: string;
      candidate_ids: string[];
    }>(
      `SELECT voter_player_id::text,
         ARRAY[candidate_one_id::text, candidate_two_id::text] AS candidate_ids
       FROM season_match_captain_tiebreaks WHERE match_id = 10`,
    )).rows[0];
    expect(tiebreak.voter_player_id).toBe("10003");
    expect(tiebreak.candidate_ids).toEqual(["10001", "10002"]);

    await voteForSeasonLobbyCaptainTiebreak(10, "10003", "10002");
    expect(mocks.createSeasonLobbyDraft).toHaveBeenCalledWith(
      expect.anything(),
      10,
      2,
      { teamA: "10002", teamB: "10006" },
    );
  });
});
