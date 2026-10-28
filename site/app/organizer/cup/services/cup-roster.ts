import { one, query } from "@/lib/db";
import { loadParticipantDirectory } from "@/lib/participants";
import type { CupPlayer } from "../model/cup-board";

export async function loadCupRoster(): Promise<{ players: CupPlayer[]; leagueName: string | null }> {
  const [directory, league] = await Promise.all([
    loadParticipantDirectory(),
    one<{ id: number; name: string }>(
      `SELECT id::int, name FROM tournaments
       WHERE tournament_type = 'seasonal' AND status <> 'draft'
       ORDER BY start_at DESC, id DESC LIMIT 1`,
    ),
  ]);
  const counts = league ? await query<{ identity_id: string; matches: number }>(
    `WITH completed_matches AS (
       SELECT match.id, round.id AS round_id
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       WHERE round.tournament_id = $1 AND round.round_kind = 'regular'
         AND match.status IN ('published', 'completed') AND match.result IS NOT NULL
     ), actual_players AS (
       SELECT participant.player_id, match.id
       FROM season_match_participants participant
       JOIN completed_matches match ON match.id = participant.match_id
       WHERE NOT EXISTS (
         SELECT 1 FROM season_match_substitutions substitution
         WHERE substitution.match_id = match.id AND substitution.game_id IS NULL
           AND substitution.outgoing_player_id = participant.player_id
       )
       UNION
       SELECT substitution.incoming_player_id, match.id
       FROM season_match_substitutions substitution
       JOIN completed_matches match ON match.id = substitution.match_id
     ), actual_counts AS (
       SELECT member.identity_id, COUNT(DISTINCT actual.id)::int AS matches
       FROM actual_players actual
       JOIN player_identity_members member ON member.player_id = actual.player_id
       GROUP BY member.identity_id
     ), snapshot_counts AS (
       SELECT member.identity_id,
         MAX(COALESCE((participant.standings_snapshot->>'playedRounds')::int, 0))::int AS matches
       FROM season_participants participant
       JOIN player_identity_members member ON member.player_id = participant.player_id
       WHERE participant.tournament_id = $1 AND participant.standings_snapshot IS NOT NULL
       GROUP BY member.identity_id
     )
     SELECT COALESCE(actual.identity_id, snapshot.identity_id)::text AS identity_id,
       COALESCE(snapshot.matches, actual.matches)::int AS matches
     FROM actual_counts actual FULL JOIN snapshot_counts snapshot USING (identity_id)`,
    [league.id],
  ) : [];
  const countsByIdentity = new Map(counts.map((row) => [row.identity_id, row.matches]));
  return {
    leagueName: league?.name ?? null,
    players: directory.flatMap((player) => player.discordId ? [{
      id: player.discordId, nickname: player.nickname, tier: player.tier,
      positions: player.positions, matchCount: countsByIdentity.get(player.identityId) ?? 0,
    }] : []),
  };
}
