import { query } from "@/lib/db";

export type PointAdjustmentRow = {
  id: number;
  player_id: string;
  nickname: string;
  round_id: number | null;
  amount: number;
  reason: string;
  adjustment_kind: "manual" | "activity";
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
  outgoing_dota_id: string;
  outgoing_nickname: string;
  incoming_player_id: string;
  incoming_dota_id: string;
  incoming_nickname: string;
  incoming_avatar_url: string | null;
  incoming_tier: number | null;
  incoming_is_captain: boolean;
  team_side: "a" | "b";
  technical_loss: boolean;
  note: string | null;
};

export type FinalistRow = {
  player_id: string;
  dota_id: string;
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
           NULLIF(season_player.nickname_snapshot, ''),
           player.ingame_name
         ) AS nickname,
         adjustment.round_id::int,
         adjustment.amount::int, adjustment.reason,
         adjustment.adjustment_kind
       FROM season_point_adjustments adjustment
       JOIN players player ON player.discord_id = adjustment.player_id
       LEFT JOIN season_participants season_player
         ON season_player.tournament_id = adjustment.tournament_id
        AND season_player.player_id = adjustment.player_id
       LEFT JOIN season_rounds round ON round.id = adjustment.round_id
       WHERE adjustment.tournament_id = $1
         ${isOrganizer ? "" : "AND (adjustment.round_id IS NULL OR round.is_visible = TRUE)"}
       ORDER BY adjustment.created_at, adjustment.id`,
      [tournamentId],
    ),
    query<PenaltyEventRow>(
      `SELECT event.id::int, event.player_id::text,
         COALESCE(
           NULLIF(season_player.nickname_snapshot, ''),
           player.ingame_name
         ) AS nickname,
         event.round_id::int,
         round.round_number::int, event.fire_count::int, event.note
       FROM season_penalty_events event
       JOIN players player ON player.discord_id = event.player_id
       LEFT JOIN season_participants season_player
         ON season_player.tournament_id = event.tournament_id
        AND season_player.player_id = event.player_id
       JOIN season_rounds round ON round.id = event.round_id
       WHERE event.tournament_id = $1 ${roundVisibility}
         AND round.round_kind = 'regular'
       ORDER BY player.ingame_name, round.round_number`,
      [tournamentId],
    ),
    query<SubstitutionRow>(
      `SELECT substitution.id::int, substitution.match_id::int,
         substitution.game_id::int, game.game_number::int,
         substitution.outgoing_player_id::text,
         COALESCE(
           current_outgoing.steam_id32,
           outgoing.steam_id32
         )::text AS outgoing_dota_id,
         COALESCE(
           NULLIF(outgoing_match.nickname_snapshot, ''),
           NULLIF(outgoing_season.nickname_snapshot, ''),
           outgoing.ingame_name
         ) AS outgoing_nickname,
         substitution.incoming_player_id::text,
         COALESCE(
           current_incoming.steam_id32,
           incoming.steam_id32
         )::text AS incoming_dota_id,
         COALESCE(
           NULLIF(incoming_match.nickname_snapshot, ''),
           NULLIF(incoming_season.nickname_snapshot, ''),
           incoming.ingame_name
         ) AS incoming_nickname,
         COALESCE(
           NULLIF(current_incoming.avatar_url, ''),
           incoming.avatar_url
         ) AS incoming_avatar_url,
         COALESCE(NULLIF(incoming.internal_rating, 0),
           CASE WHEN incoming.rank_tier >= 10 THEN incoming.rank_tier / 10
             WHEN incoming.rank_tier > 0 THEN incoming.rank_tier END
         )::int AS incoming_tier,
         EXISTS (
           SELECT 1 FROM season_match_rooms room
           WHERE room.match_id = substitution.match_id
             AND substitution.incoming_player_id IN (
               room.team_a_captain_id, room.team_b_captain_id
             )
         ) AS incoming_is_captain,
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
       LEFT JOIN season_match_participants outgoing_match
         ON outgoing_match.match_id = substitution.match_id
        AND outgoing_match.player_id = substitution.outgoing_player_id
       LEFT JOIN season_match_participants incoming_match
         ON incoming_match.match_id = substitution.match_id
        AND incoming_match.player_id = substitution.incoming_player_id
       LEFT JOIN season_participants outgoing_season
         ON outgoing_season.tournament_id = round.tournament_id
        AND outgoing_season.player_id = substitution.outgoing_player_id
       LEFT JOIN season_participants incoming_season
         ON incoming_season.tournament_id = round.tournament_id
        AND incoming_season.player_id = substitution.incoming_player_id
       LEFT JOIN player_identity_members outgoing_member
         ON outgoing_member.player_id = substitution.outgoing_player_id
       LEFT JOIN player_identities outgoing_identity
         ON outgoing_identity.id = outgoing_member.identity_id
       LEFT JOIN players current_outgoing
         ON current_outgoing.discord_id = outgoing_identity.registered_player_id
        AND current_outgoing.is_archived = FALSE
       LEFT JOIN player_identity_members incoming_member
         ON incoming_member.player_id = substitution.incoming_player_id
       LEFT JOIN player_identities incoming_identity
         ON incoming_identity.id = incoming_member.identity_id
       LEFT JOIN players current_incoming
         ON current_incoming.discord_id = incoming_identity.registered_player_id
        AND current_incoming.is_archived = FALSE
       LEFT JOIN season_match_games game ON game.id = substitution.game_id
       WHERE round.tournament_id = $1 ${roundVisibility} ${matchVisibility}
         ${isOrganizer ? "" : "AND (substitution.game_id IS NULL OR game.status IN ('published', 'completed'))"}
       ORDER BY substitution.match_id, game.game_number, substitution.id`,
      [tournamentId],
    ),
    query<FinalistRow>(
      `SELECT finalist.player_id::text,
         COALESCE(current_player.steam_id32, player.steam_id32)::text AS dota_id,
         COALESCE(NULLIF(season_player.nickname_snapshot, ''), player.ingame_name) AS nickname,
         COALESCE(NULLIF(current_player.avatar_url, ''), player.avatar_url) AS avatar_url,
         finalist.seed::int, finalist.note
       FROM season_finalists finalist
       JOIN players player ON player.discord_id = finalist.player_id
       LEFT JOIN season_participants season_player
         ON season_player.tournament_id = finalist.tournament_id
        AND season_player.player_id = finalist.player_id
       LEFT JOIN player_identity_members identity_member
         ON identity_member.player_id = finalist.player_id
       LEFT JOIN player_identities identity
         ON identity.id = identity_member.identity_id
       LEFT JOIN players current_player
         ON current_player.discord_id = identity.registered_player_id
        AND current_player.is_archived = FALSE
       WHERE finalist.tournament_id = $1 ${finalsVisibility}
       ORDER BY finalist.seed NULLS LAST, nickname`,
      [tournamentId],
    ),
  ]);
}
