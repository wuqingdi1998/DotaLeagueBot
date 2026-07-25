import { one, query } from "./db";

const steamId64Offset = BigInt("76561197960265728");
const maximumDotaAccountId = BigInt("4294967295");

export type PlayerMedals = {
  gold: number;
  silver: number;
  bronze: number;
};

export type PlayerTournamentHistory = {
  id: number;
  slug: string;
  name: string;
  startAt: string;
  endAt: string;
  status: string;
  teamName: string;
  placement: number | null;
  resultLabel: string | null;
};

export type PublicPlayerProfile = {
  dotaId: string;
  nickname: string;
  positions: string | null;
  avatarUrl: string | null;
  links: {
    dotabuff: string;
    stratz: string;
    steam: string;
  };
  statistics: {
    tournaments: number;
    tournamentWins: number;
    podiums: number;
    matches: number;
    matchWins: number;
  };
  medals: PlayerMedals;
  lastTournament: PlayerTournamentHistory | null;
  tournamentHistory: PlayerTournamentHistory[];
};

type PlayerRow = {
  discord_id: string;
  dota_id: string;
  nickname: string;
  positions: string | null;
  avatar_url: string | null;
};

type TournamentHistoryRow = {
  id: number;
  slug: string;
  name: string;
  start_at: Date | string;
  end_at: Date | string;
  status: string;
  team_name: string;
  placement: number | null;
  result_label: string | null;
};

export function normalizeDotaAccountId(value: string): string | null {
  if (!/^\d{1,10}$/.test(value)) return null;
  const parsed = BigInt(value);
  if (parsed < BigInt(1) || parsed > maximumDotaAccountId) return null;
  return parsed.toString();
}

export function buildPlayerLinks(dotaId: string) {
  const normalized = normalizeDotaAccountId(dotaId);
  if (!normalized) throw new Error("Некорректный Dota ID");
  const steamId64 = steamId64Offset + BigInt(normalized);
  return {
    dotabuff: `https://www.dotabuff.com/players/${normalized}`,
    stratz: `https://stratz.com/players/${normalized}`,
    steam: `https://steamcommunity.com/profiles/${steamId64}`,
  };
}

export function tournamentResultLabel(
  placement: number | null,
  resultLabel: string | null,
  status: string,
) {
  if (resultLabel?.trim()) return resultLabel.trim();
  if (placement) return `${placement}-е место`;
  if (status === "active" || status === "registration") return "Участвует";
  return "Результат пока не указан";
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

export async function loadPublicPlayerProfile(
  requestedDotaId: string,
): Promise<PublicPlayerProfile | null> {
  const dotaId = normalizeDotaAccountId(requestedDotaId);
  if (!dotaId) return null;

  const player = await one<PlayerRow>(
    `SELECT
       p.discord_id::text,
       p.steam_id32::text AS dota_id,
       p.ingame_name AS nickname,
       p.positions,
       COALESCE(
         NULLIF(p.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url
     FROM players p
     LEFT JOIN LATERAL (
       SELECT s.discord_avatar_url
       FROM web_sessions s
       WHERE s.discord_id = p.discord_id
         AND s.discord_avatar_url IS NOT NULL
       ORDER BY s.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     WHERE p.steam_id32 = $1`,
    [dotaId],
  );
  if (!player) return null;

  const [historyRows, matchStatistics, medalCounts] = await Promise.all([
    query<TournamentHistoryRow>(
      `SELECT
         t.id::int,
         t.slug,
         t.name,
         t.start_at,
         t.end_at,
         t.status,
         a.team_name,
         result.placement::int,
         result.result_label
       FROM tournament_team_members member
       JOIN tournament_team_applications a
         ON a.id = member.application_id
       JOIN tournaments t
         ON t.id = a.tournament_id
       LEFT JOIN tournament_team_results result
         ON result.application_id = a.id
       WHERE member.player_id = $1
         AND member.invitation_status = 'accepted'
         AND a.status = 'approved'
         AND t.status IN ('active', 'finished', 'archived')
       ORDER BY t.end_at DESC, t.start_at DESC, t.id DESC`,
      [player.discord_id],
    ),
    one<{ matches: number; wins: number }>(
      `WITH player_applications AS (
         SELECT DISTINCT member.application_id
         FROM tournament_team_members member
         JOIN tournament_team_applications application
           ON application.id = member.application_id
         WHERE member.player_id = $1
           AND member.invitation_status = 'accepted'
           AND application.status = 'approved'
       )
       SELECT
         COUNT(played_match.id)::int AS matches,
         COUNT(played_match.id) FILTER (
           WHERE
             (
               played_match.team_a_application_id = application.application_id
               AND played_match.team_a_score > played_match.team_b_score
             )
             OR
             (
               played_match.team_b_application_id = application.application_id
               AND played_match.team_b_score > played_match.team_a_score
             )
         )::int AS wins
       FROM tournament_matches played_match
       JOIN player_applications application
         ON application.application_id IN (
           played_match.team_a_application_id,
           played_match.team_b_application_id
         )
       WHERE played_match.status = 'finished'`,
      [player.discord_id],
    ),
    one<PlayerMedals>(
      `SELECT
         COUNT(*) FILTER (WHERE medal_type = 'gold')::int AS gold,
         COUNT(*) FILTER (WHERE medal_type = 'silver')::int AS silver,
         COUNT(*) FILTER (WHERE medal_type = 'bronze')::int AS bronze
       FROM player_medals
       WHERE player_id = $1`,
      [player.discord_id],
    ),
  ]);

  const tournamentHistory = historyRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    startAt: iso(row.start_at),
    endAt: iso(row.end_at),
    status: row.status,
    teamName: row.team_name,
    placement: row.placement,
    resultLabel: row.result_label,
  }));
  const tournamentWins = tournamentHistory.filter(
    (tournament) => tournament.placement === 1,
  ).length;
  const podiums = tournamentHistory.filter(
    (tournament) =>
      tournament.placement !== null && tournament.placement <= 3,
  ).length;

  return {
    dotaId: player.dota_id,
    nickname: player.nickname,
    positions: player.positions,
    avatarUrl: player.avatar_url,
    links: buildPlayerLinks(player.dota_id),
    statistics: {
      tournaments: tournamentHistory.length,
      tournamentWins,
      podiums,
      matches: matchStatistics?.matches ?? 0,
      matchWins: matchStatistics?.wins ?? 0,
    },
    medals: medalCounts ?? { gold: 0, silver: 0, bronze: 0 },
    lastTournament: tournamentHistory[0] ?? null,
    tournamentHistory,
  };
}
