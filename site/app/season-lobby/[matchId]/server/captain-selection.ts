import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import {
  automaticCaptainBallots,
  resolveCaptainSelection,
  resolveCaptainTiebreak,
  SEASON_CAPTAIN_STAGE_SECONDS,
  type CaptainBallot,
  type CaptainSelectionPlayer,
} from "../model/captain-selection";
import { createSeasonLobbyDraft } from "./captain-draft";
import { SeasonLobbyRoomError } from "./errors";
import { lockRoom } from "./room-access";

type TeamSide = "a" | "b";

type TeamPlayerRow = CaptainSelectionPlayer & {
  teamSide: TeamSide;
  slotNumber: number | null;
};

type StoredBallotRow = CaptainBallot & { teamSide: TeamSide };

async function loadSelectionState(client: PoolClient, matchId: number) {
  const [playerResult, ballotResult] = await Promise.all([
    client.query<TeamPlayerRow>(
      `SELECT participant.player_id::text AS "playerId",
         participant.team_side AS "teamSide",
         participant.tier_snapshot::int AS tier,
         participant.slot_number::int AS "slotNumber",
         COALESCE(preference.wants_to_be_captain, FALSE) AS "wantsCaptain"
       FROM season_match_room_players participant
       LEFT JOIN season_match_captain_preferences preference
         ON preference.match_id = participant.match_id
        AND preference.player_id = participant.player_id
       WHERE participant.match_id = $1
       ORDER BY participant.team_side, participant.slot_number NULLS LAST,
         participant.player_id`,
      [matchId],
    ),
    client.query<StoredBallotRow>(
      `SELECT voter_player_id::text AS "voterPlayerId",
         candidate_player_id::text AS "candidatePlayerId",
         team_side AS "teamSide", is_automatic AS "isAutomatic"
       FROM season_match_captain_votes
       WHERE match_id = $1
       ORDER BY created_at, voter_player_id`,
      [matchId],
    ),
  ]);
  return { players: playerResult.rows, ballots: ballotResult.rows };
}

function teamState(
  state: Awaited<ReturnType<typeof loadSelectionState>>,
  side: TeamSide,
) {
  return {
    players: state.players.filter((player) => player.teamSide === side),
    ballots: state.ballots.filter((ballot) => ballot.teamSide === side),
  };
}

async function isInterestComplete(client: PoolClient, matchId: number) {
  const result = await client.query<{
    participant_count: number;
    response_count: number;
  }>(
    `SELECT COUNT(participant.player_id)::int AS participant_count,
       COUNT(preference.player_id)::int AS response_count
     FROM season_match_room_players participant
     LEFT JOIN season_match_captain_preferences preference
       ON preference.match_id = participant.match_id
      AND preference.player_id = participant.player_id
     WHERE participant.match_id = $1`,
    [matchId],
  );
  const counts = result.rows[0];
  return counts.participant_count === 10 && counts.response_count === 10;
}

async function isVotingComplete(client: PoolClient, matchId: number) {
  const result = await client.query<{ expected: number; received: number }>(
    `WITH candidate_counts AS (
       SELECT team_side, COUNT(*)::int AS candidate_count
       FROM season_match_captain_preferences
       WHERE match_id = $1 AND wants_to_be_captain = TRUE
       GROUP BY team_side
     ), eligible AS (
       SELECT preference.player_id
       FROM season_match_captain_preferences preference
       JOIN candidate_counts candidate ON candidate.team_side = preference.team_side
       WHERE preference.match_id = $1
         AND preference.wants_to_be_captain = FALSE
         AND candidate.candidate_count > 1
     )
     SELECT COUNT(eligible.player_id)::int AS expected,
       COUNT(vote.voter_player_id)::int AS received
     FROM eligible
     LEFT JOIN season_match_captain_votes vote
       ON vote.match_id = $1 AND vote.voter_player_id = eligible.player_id
      AND vote.is_automatic = FALSE`,
    [matchId],
  );
  return result.rows[0].expected === result.rows[0].received;
}

async function isTiebreakComplete(client: PoolClient, matchId: number) {
  const result = await client.query<{ pending: number }>(
    `SELECT COUNT(*) FILTER (WHERE selected_candidate_id IS NULL)::int AS pending
     FROM season_match_captain_tiebreaks WHERE match_id = $1`,
    [matchId],
  );
  return result.rows[0].pending === 0;
}

async function completeInterestStage(
  client: PoolClient,
  matchId: number,
  bestOf: number,
) {
  await client.query(
    `INSERT INTO season_match_captain_preferences
       (match_id, player_id, team_side, wants_to_be_captain)
     SELECT participant.match_id, participant.player_id,
       participant.team_side, FALSE
     FROM season_match_room_players participant
     WHERE participant.match_id = $1
     ON CONFLICT (match_id, player_id) DO NOTHING`,
    [matchId],
  );
  const state = await loadSelectionState(client, matchId);
  const automaticBallots = automaticCaptainBallots(state.players);
  for (const ballot of automaticBallots) {
    const player = state.players.find(
      (candidate) => candidate.playerId === ballot.voterPlayerId,
    );
    await client.query(
      `INSERT INTO season_match_captain_votes
        (match_id, voter_player_id, candidate_player_id, team_side, is_automatic)
       VALUES ($1, $2, $2, $3, TRUE)
       ON CONFLICT (match_id, voter_player_id) DO UPDATE
         SET candidate_player_id = EXCLUDED.candidate_player_id,
           team_side = EXCLUDED.team_side, is_automatic = TRUE,
           created_at = NOW()`,
      [matchId, ballot.voterPlayerId, player?.teamSide],
    );
  }
  const results = (["a", "b"] as const).map((side) => {
    const team = teamState(state, side);
    const candidateCount = team.players.filter(
      (player) => player.wantsCaptain,
    ).length;
    return {
      side,
      candidateCount,
      result: candidateCount <= 1
        ? resolveCaptainSelection(team.players, team.ballots, randomInt)
        : null,
    };
  });
  const captainA = results[0].result?.kind === "captain"
    ? results[0].result.captainPlayerId
    : null;
  const captainB = results[1].result?.kind === "captain"
    ? results[1].result.captainPlayerId
    : null;
  if (captainA && captainB) {
    await createSeasonLobbyDraft(client, matchId, bestOf, {
      teamA: captainA,
      teamB: captainB,
    });
    return;
  }
  await client.query(
    `UPDATE season_match_rooms
     SET status = 'captain_voting', team_a_captain_id = $2,
       team_b_captain_id = $3,
       captain_stage_deadline_at = NOW() + ($4::int * INTERVAL '1 second'),
       updated_at = NOW()
     WHERE match_id = $1`,
    [matchId, captainA, captainB, SEASON_CAPTAIN_STAGE_SECONDS],
  );
  if (await isVotingComplete(client, matchId)) {
    await completeVotingStage(client, matchId, bestOf);
  }
}

async function completeVotingStage(
  client: PoolClient,
  matchId: number,
  bestOf: number,
) {
  const room = await lockRoom(client, matchId);
  const state = await loadSelectionState(client, matchId);
  const captainIds: Record<TeamSide, string | null> = {
    a: room.team_a_captain_id,
    b: room.team_b_captain_id,
  };
  let hasTiebreak = false;
  for (const side of ["a", "b"] as const) {
    if (captainIds[side]) continue;
    const team = teamState(state, side);
    const result = resolveCaptainSelection(team.players, team.ballots, randomInt);
    if (result.kind === "captain") {
      captainIds[side] = result.captainPlayerId;
      continue;
    }
    hasTiebreak = true;
    await client.query(
      `INSERT INTO season_match_captain_tiebreaks
        (match_id, team_side, voter_player_id, candidate_one_id, candidate_two_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (match_id, team_side) DO UPDATE SET
         voter_player_id = EXCLUDED.voter_player_id,
         candidate_one_id = EXCLUDED.candidate_one_id,
         candidate_two_id = EXCLUDED.candidate_two_id,
         selected_candidate_id = NULL, responded_at = NULL`,
      [
        matchId,
        side,
        result.voterPlayerId,
        result.candidatePlayerIds[0],
        result.candidatePlayerIds[1],
      ],
    );
  }
  if (!hasTiebreak && captainIds.a && captainIds.b) {
    await createSeasonLobbyDraft(client, matchId, bestOf, {
      teamA: captainIds.a,
      teamB: captainIds.b,
    });
    return;
  }
  await client.query(
    `UPDATE season_match_rooms
     SET status = 'captain_tiebreak', team_a_captain_id = $2,
       team_b_captain_id = $3,
       captain_stage_deadline_at = NOW() + ($4::int * INTERVAL '1 second'),
       updated_at = NOW()
     WHERE match_id = $1`,
    [
      matchId,
      captainIds.a,
      captainIds.b,
      SEASON_CAPTAIN_STAGE_SECONDS,
    ],
  );
}

async function completeTiebreakStage(
  client: PoolClient,
  matchId: number,
  bestOf: number,
) {
  const room = await lockRoom(client, matchId);
  const result = await client.query<{
    team_side: TeamSide;
    candidate_one_id: string;
    candidate_one_tier: number | null;
    candidate_two_id: string;
    candidate_two_tier: number | null;
    selected_candidate_id: string | null;
  }>(
    `SELECT tiebreak.team_side,
       tiebreak.candidate_one_id::text, first_player.tier_snapshot::int
         AS candidate_one_tier,
       tiebreak.candidate_two_id::text, second_player.tier_snapshot::int
         AS candidate_two_tier,
       tiebreak.selected_candidate_id::text
     FROM season_match_captain_tiebreaks tiebreak
     JOIN season_match_room_players first_player
       ON first_player.match_id = tiebreak.match_id
      AND first_player.player_id = tiebreak.candidate_one_id
     JOIN season_match_room_players second_player
       ON second_player.match_id = tiebreak.match_id
      AND second_player.player_id = tiebreak.candidate_two_id
     WHERE tiebreak.match_id = $1`,
    [matchId],
  );
  const captainIds: Record<TeamSide, string | null> = {
    a: room.team_a_captain_id,
    b: room.team_b_captain_id,
  };
  for (const row of result.rows) {
    captainIds[row.team_side] = resolveCaptainTiebreak([
      { playerId: row.candidate_one_id, tier: row.candidate_one_tier },
      { playerId: row.candidate_two_id, tier: row.candidate_two_tier },
    ], row.selected_candidate_id, randomInt);
  }
  if (!captainIds.a || !captainIds.b) {
    throw new SeasonLobbyRoomError("Не удалось определить капитанов", 409);
  }
  await createSeasonLobbyDraft(client, matchId, bestOf, {
    teamA: captainIds.a,
    teamB: captainIds.b,
  });
}

export async function advanceCaptainSelection(
  client: PoolClient,
  matchId: number,
): Promise<void> {
  const room = await lockRoom(client, matchId);
  const hasExpired = Boolean(
    room.captain_stage_deadline_at &&
    new Date(room.captain_stage_deadline_at).getTime() <= Date.now(),
  );
  if (
    room.status === "captain_interest" &&
    (hasExpired || await isInterestComplete(client, matchId))
  ) {
    await completeInterestStage(client, matchId, room.best_of);
  } else if (
    room.status === "captain_voting" &&
    (hasExpired || await isVotingComplete(client, matchId))
  ) {
    await completeVotingStage(client, matchId, room.best_of);
  } else if (
    room.status === "captain_tiebreak" &&
    (hasExpired || await isTiebreakComplete(client, matchId))
  ) {
    await completeTiebreakStage(client, matchId, room.best_of);
  }
}
