import { query } from "@/lib/db";

export type PointAdjustmentRow = {
  id: number;
  player_id: string;
  nickname: string;
  round_id: number | null;
  amount: number;
  reason: string;
};

export type PenaltyEventRow = {
  id: number;
  player_id: string;
  nickname: string;
  round_id: number;
  round_number: number;
  fire_count: number;
  note: string | null;
};

export type SubstitutionRow = {
  id: number;
  match_id: number;
  game_id: number | null;
  game_number: number | null;
  outgoing_player_id: string;
  outgoing_nickname: string;
  incoming_player_id: string;
  incoming_nickname: string;
  incoming_avatar_url: string | null;
  team_side: "a" | "b";
  technical_loss: boolean;
  note: string | null;
};

export type FinalistRow = {
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  seed: number | null;
  note: string | null;
};

export async function loadSeasonExtras(
  tournamentId: number,
  isOrganizer: boolean,
) {
  const roundVisibility = isOrganizer ? "" : "AND round.is_visible = TRUE";
  const matchVisibility = isOrganizer
    ? ""
    : "AND match.status IN ('published', 'completed')";
  const finalsVisibility = isOrganizer
    ? ""
    : `AND EXISTS (
       SELECT 1 FROM season_rounds finals_round
       WHERE finals_round.tournament_id = finalist.tournament_id
         AND finals_round.round_kind = 'finals'
         AND finals_round.is_visible = TRUE
     )`;

  return Promise.all([
    query<PointAdjustmentRow>(
      `SELECT adjustment.id::int, adjustment.player_id::text,
         COALESCE(
           participant.nickname_snapshot, player.ingame_name
         ) AS nickname,
         adjustment.round_id::int,
         adjustment.amount::int, adjustment.reason
       FROM season_point_adjustments adjustment
       JOIN players player ON player.discord_id = adjustment.player_id
       LEFT JOIN season_participants participant
         ON participant.tournament_id = adjustment.tournament_id
        AND participant.player_id = adjustment.player_id
       LEFT JOIN season_rounds round ON round.id = adjustment.round_id
       WHERE adjustment.tournament_id = $1
         ${isOrganizer ? "" : "AND (adjustment.round_id IS NULL OR round.is_visible = TRUE)"}
       ORDER BY adjustment.created_at, adjustment.id`,
      [tournamentId],
    ),
    query<PenaltyEventRow>(
      `SELECT event.id::int, event.player_id::text,
         COALESCE(
           participant.nickname_snapshot, player.ingame_name
         ) AS nickname,
         event.round_id::int,
         round.round_number::int, event.fire_count::int, event.note
       FROM season_penalty_events event
       JOIN players player ON player.discord_id = event.player_id
       LEFT JOIN season_participants participant
         ON participant.tournament_id = event.tournament_id
        AND participant.player_id = event.player_id
       JOIN season_rounds round ON round.id = event.round_id
       WHERE event.tournament_id = $1 ${roundVisibility}
         AND round.round_kind = 'regular'
       ORDER BY COALESCE(
         participant.nickname_snapshot, player.ingame_name
       ), round.round_number`,
      [tournamentId],
    ),
    query<SubstitutionRow>(
      `SELECT substitution.id::int, substitution.match_id::int,
         substitution.game_id::int, game.game_number::int,
         substitution.outgoing_player_id::text,
         outgoing.ingame_name AS outgoing_nickname,
         substitution.incoming_player_id::text,
         incoming.ingame_name AS incoming_nickname,
         incoming.avatar_url AS incoming_avatar_url,
         substitution.team_side, substitution.technical_loss,
         substitution.note
       FROM season_match_substitutions substitution
       JOIN players outgoing
         ON outgoing.discord_id = substitution.outgoing_player_id
       JOIN players incoming
         ON incoming.discord_id = substitution.incoming_player_id
       JOIN season_matches match ON match.id = substitution.match_id
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       LEFT JOIN season_match_games game ON game.id = substitution.game_id
       WHERE round.tournament_id = $1 ${roundVisibility} ${matchVisibility}
         ${isOrganizer ? "" : "AND (substitution.game_id IS NULL OR game.status IN ('published', 'completed'))"}
       ORDER BY substitution.match_id, game.game_number, substitution.id`,
      [tournamentId],
    ),
    query<FinalistRow>(
      `SELECT finalist.player_id::text,
         COALESCE(
           participant.nickname_snapshot, player.ingame_name
         ) AS nickname,
         player.avatar_url,
         finalist.seed::int, finalist.note
       FROM season_finalists finalist
       JOIN players player ON player.discord_id = finalist.player_id
       LEFT JOIN season_participants participant
         ON participant.tournament_id = finalist.tournament_id
        AND participant.player_id = finalist.player_id
       WHERE finalist.tournament_id = $1 ${finalsVisibility}
       ORDER BY finalist.seed NULLS LAST,
         COALESCE(participant.nickname_snapshot, player.ingame_name)`,
      [tournamentId],
    ),
  ]);
}
