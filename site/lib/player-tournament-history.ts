import { query } from "./db";

export type PlayerTournamentHistory = {
  id: number;
  slug: string;
  name: string;
  startAt: string;
  endAt: string;
  status: string;
  tournamentType: "ordinary" | "seasonal";
  teamName: string | null;
  usedNickname: string | null;
  placement: number | null;
  resultLabel: string | null;
};

type TournamentHistoryRow = {
  id: number;
  slug: string;
  name: string;
  start_at: Date | string;
  end_at: Date | string;
  status: string;
  tournament_type: "ordinary" | "seasonal";
  team_name: string | null;
  used_nickname: string | null;
  rank_snapshot: number | null;
  placement: number | null;
  result_label: string | null;
};

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

export function historicalNickname(
  currentNickname: string,
  usedNickname: string | null,
) {
  if (!usedNickname?.trim()) return null;
  return currentNickname.trim().localeCompare(
    usedNickname.trim(),
    "ru-RU",
    { sensitivity: "accent" },
  ) === 0
    ? null
    : usedNickname.trim();
}

export async function loadPlayerTournamentHistory(
  playerIds: string[],
  currentNickname: string,
): Promise<PlayerTournamentHistory[]> {
  const rows = await query<TournamentHistoryRow>(
    `WITH ordinary_participations AS (
       SELECT
         snapshot.application_id,
         snapshot.nickname_snapshot AS used_nickname,
         1 AS source_priority
       FROM tournament_roster_snapshots snapshot
       WHERE snapshot.player_id = ANY($1::bigint[])

       UNION ALL

       SELECT
         member.application_id,
         member.nickname_snapshot AS used_nickname,
         2 AS source_priority
       FROM tournament_team_members member
       WHERE member.player_id = ANY($1::bigint[])
         AND member.invitation_status = 'accepted'
         AND NOT EXISTS (
           SELECT 1
           FROM tournament_roster_snapshots snapshot
           WHERE snapshot.application_id = member.application_id
             AND snapshot.player_id = member.player_id
         )
     ),
     ordinary_history AS (
       SELECT DISTINCT ON (tournament.id)
         tournament.id::int,
         tournament.slug,
         tournament.name,
         tournament.start_at,
         tournament.end_at,
         tournament.status,
         'ordinary'::text AS tournament_type,
         application.team_name,
         participation.used_nickname,
         NULL::int AS rank_snapshot,
         result.placement::int,
         result.result_label
       FROM ordinary_participations participation
       JOIN tournament_team_applications application
         ON application.id = participation.application_id
       JOIN tournaments tournament
         ON tournament.id = application.tournament_id
       LEFT JOIN tournament_team_results result
         ON result.application_id = application.id
       WHERE application.status = 'approved'
         AND tournament.tournament_type <> 'seasonal'
         AND tournament.status IN ('active', 'finished', 'archived')
       ORDER BY tournament.id, participation.source_priority
     ),
     season_participations AS (
       SELECT
         participant.tournament_id,
         participant.nickname_snapshot AS used_nickname,
         participant.rank_snapshot::int,
         1 AS source_priority
       FROM season_participants participant
       WHERE participant.player_id = ANY($1::bigint[])

       UNION ALL

       SELECT
         round.tournament_id,
         participant.nickname_snapshot AS used_nickname,
         NULL::int AS rank_snapshot,
         2 AS source_priority
       FROM season_match_participants participant
       JOIN season_matches match ON match.id = participant.match_id
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       WHERE participant.player_id = ANY($1::bigint[])
     ),
     seasonal_history AS (
       SELECT DISTINCT ON (tournament.id)
         tournament.id::int,
         tournament.slug,
         tournament.name,
         tournament.start_at,
         tournament.end_at,
         tournament.status,
         'seasonal'::text AS tournament_type,
         NULL::text AS team_name,
         participation.used_nickname,
         participation.rank_snapshot,
         CASE medal.medal_type
           WHEN 'gold' THEN 1
           WHEN 'silver' THEN 2
         END::int AS placement,
         CASE medal.medal_type
           WHEN 'gold' THEN 'Победитель'
           WHEN 'silver' THEN 'Финалист'
         END AS result_label
       FROM season_participations participation
       JOIN tournaments tournament
         ON tournament.id = participation.tournament_id
       LEFT JOIN LATERAL (
         SELECT awarded.medal_type
         FROM player_medals awarded
         WHERE awarded.tournament_id = tournament.id
           AND awarded.player_id = ANY($1::bigint[])
           AND awarded.medal_type IN ('gold', 'silver')
         ORDER BY CASE awarded.medal_type WHEN 'gold' THEN 1 ELSE 2 END
         LIMIT 1
       ) medal ON TRUE
       WHERE tournament.tournament_type = 'seasonal'
         AND tournament.status IN ('active', 'finished', 'archived')
       ORDER BY
         tournament.id,
         participation.source_priority,
         participation.rank_snapshot NULLS LAST
     )
     SELECT *
     FROM (
       SELECT * FROM ordinary_history
       UNION ALL
       SELECT * FROM seasonal_history
     ) history
     ORDER BY end_at DESC, start_at DESC, id DESC`,
    [playerIds],
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    startAt: iso(row.start_at),
    endAt: iso(row.end_at),
    status: row.status,
    tournamentType: row.tournament_type,
    teamName: row.team_name,
    usedNickname: historicalNickname(currentNickname, row.used_nickname),
    placement: row.placement,
    resultLabel:
      row.result_label ??
      (row.tournament_type === "seasonal"
        ? row.rank_snapshot
          ? `Место в сезонной таблице — ${row.rank_snapshot}`
          : "Участвовал в сезоне"
        : null),
  }));
}
