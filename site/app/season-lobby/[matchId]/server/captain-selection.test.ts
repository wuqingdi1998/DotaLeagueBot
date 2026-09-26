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
    team_a_captain_id: string | null;
    team_b_captain_id: string | null;
  }>(
    `SELECT status,
       EXTRACT(EPOCH FROM captain_stage_deadline_at - NOW())::int
         AS deadline_seconds,
       team_a_captain_id::text,
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
  it("fixes the first captain-interest answer immediately", async () => {
    await startSeasonLobbyCaptainSelection(10, organizer, true);
    await answerCaptainInterest(10, "10001", true);

    await expect(
      answerCaptainInterest(10, "10001", false),
    ).rejects.toThrow("Ответ уже зафиксирован");
    const preference = await db.query<{ wants_to_be_captain: boolean }>(
      `SELECT wants_to_be_captain
       FROM season_match_captain_preferences
       WHERE match_id = 10 AND player_id = 10001`,
    );
    expect(preference.rows[0].wants_to_be_captain).toBe(true);
  });

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
    expect((await roomState()).status).toBe("captain_reveal");
    await db.exec(
      "UPDATE season_match_rooms SET captain_stage_deadline_at = NOW() - INTERVAL '1 second'",
    );
    await testTransaction(db)((client) => advanceCaptainSelection(client, 10));
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
    expect((await roomState()).status).toBe("captain_reveal");

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

    await db.exec(
      "UPDATE season_match_rooms SET captain_stage_deadline_at = NOW() - INTERVAL '1 second'",
    );
    await testTransaction(db)((client) => advanceCaptainSelection(client, 10));
    expect((await roomState()).status).toBe("captain_tiebreak");

    await voteForSeasonLobbyCaptainTiebreak(10, "10003", "10002");
    expect((await roomState()).status).toBe("captain_reveal");
    await db.exec(
      "UPDATE season_match_rooms SET captain_stage_deadline_at = NOW() - INTERVAL '1 second'",
    );
    await testTransaction(db)((client) => advanceCaptainSelection(client, 10));
    expect(mocks.createSeasonLobbyDraft).toHaveBeenCalledWith(
      expect.anything(),
      10,
      2,
      { teamA: "10002", teamB: "10006" },
    );
  });

  it("fixes each vote and reveals a team's captain as soon as that team finishes", async () => {
    await startSeasonLobbyCaptainSelection(10, organizer, true);
    const volunteers = new Set(["10001", "10002", "10006", "10007"]);
    for (let id = 10001; id <= 10010; id += 1) {
      await answerCaptainInterest(10, String(id), volunteers.has(String(id)));
    }

    await voteForSeasonLobbyCaptain(10, "10003", "10001");
    await expect(
      voteForSeasonLobbyCaptain(10, "10003", "10002"),
    ).rejects.toThrow("Голос уже зафиксирован");
    const fixedVote = await db.query<{ candidate_player_id: string }>(
      `SELECT candidate_player_id::text
       FROM season_match_captain_votes
       WHERE match_id = 10 AND voter_player_id = 10003`,
    );
    expect(fixedVote.rows[0].candidate_player_id).toBe("10001");

    await voteForSeasonLobbyCaptain(10, "10004", "10001");
    await voteForSeasonLobbyCaptain(10, "10005", "10001");

    expect(await roomState()).toMatchObject({
      status: "captain_voting",
      team_a_captain_id: "10001",
      team_b_captain_id: null,
    });
    expect(mocks.createSeasonLobbyDraft).not.toHaveBeenCalled();
  });
});
