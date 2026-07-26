import { one, query } from "./db";

const steamId64Offset = BigInt("76561197960265728");
const maximumDotaAccountId = BigInt("4294967295");

export const subscriptionRoleNames = [
  "Руна Регенерации",
  "Руна Ускорения",
  "Руна Невидимости",
  "Руна Волшебства",
  "Руна Иллюзий",
  "Руна Усиления урона",
  "Руна Воды",
] as const;

export const customizableSubscriptionRoleNames =
  subscriptionRoleNames.filter((role) => role !== "Руна Воды");

export const profileBackgroundKeys = [
  "default",
  "regeneration",
  "haste",
  "invisibility",
  "arcane",
  "illusion",
  "damage",
] as const;

export type ProfileBackgroundKey = (typeof profileBackgroundKeys)[number];

export const subscriptionRoleBackgrounds: Record<
  (typeof subscriptionRoleNames)[number],
  ProfileBackgroundKey
> = {
  "Руна Регенерации": "regeneration",
  "Руна Ускорения": "haste",
  "Руна Невидимости": "invisibility",
  "Руна Волшебства": "arcane",
  "Руна Иллюзий": "illusion",
  "Руна Усиления урона": "damage",
  "Руна Воды": "default",
};

export function profileBackgroundForSubscriptionRole(
  roleName: string | null,
): ProfileBackgroundKey {
  if (!roleName || !subscriptionRoleNames.includes(
    roleName as (typeof subscriptionRoleNames)[number],
  )) {
    return "default";
  }
  return subscriptionRoleBackgrounds[
    roleName as (typeof subscriptionRoleNames)[number]
  ];
}

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
  realName: string | null;
  positions: string | null;
  avatarUrl: string | null;
  subscriptionRole: string | null;
  subscriptionRoleColor: number | null;
  backgroundKey: ProfileBackgroundKey;
  customBackgroundUrl: string | null;
  hasCustomBackground: boolean;
  canCustomizeBackground: boolean;
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
  real_name: string | null;
  positions: string | null;
  avatar_url: string | null;
  subscription_role: string | null;
  subscription_role_color: number | null;
  custom_background_key: string | null;
};

export type HallOfFamePlayer = {
  dotaId: string;
  nickname: string;
  avatarUrl: string | null;
  medals: PlayerMedals;
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
       p.real_name,
       p.positions,
       COALESCE(
         NULLIF(p.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       subscription.role_name AS subscription_role,
       subscription.role_color::int AS subscription_role_color,
       preference.custom_background_key
     FROM players p
     LEFT JOIN LATERAL (
       SELECT s.discord_avatar_url
       FROM web_sessions s
       WHERE s.discord_id = p.discord_id
         AND s.discord_avatar_url IS NOT NULL
       ORDER BY s.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     LEFT JOIN LATERAL (
       SELECT role.role_name, role.role_color
       FROM player_discord_roles role
       WHERE role.player_id = p.discord_id
         AND role.role_name IN (
           'Руна Регенерации',
           'Руна Ускорения',
           'Руна Невидимости',
           'Руна Волшебства',
           'Руна Иллюзий',
           'Руна Усиления урона',
           'Руна Воды'
         )
       ORDER BY CASE role.role_name
         WHEN 'Руна Регенерации' THEN 1
         WHEN 'Руна Ускорения' THEN 2
         WHEN 'Руна Невидимости' THEN 3
         WHEN 'Руна Волшебства' THEN 4
         WHEN 'Руна Иллюзий' THEN 5
         WHEN 'Руна Усиления урона' THEN 6
         ELSE 7
       END
       LIMIT 1
     ) subscription ON TRUE
     LEFT JOIN player_profile_preferences preference
       ON preference.player_id = p.discord_id
     WHERE p.steam_id32 = $1`,
    [dotaId],
  );
  if (!player) return null;

  const [historyRows, matchStatistics, medalCounts] = await Promise.all([
    query<TournamentHistoryRow>(
      `WITH participations AS (
         SELECT member.application_id
         FROM tournament_team_members member
         WHERE member.player_id = $1
           AND member.invitation_status = 'accepted'
         UNION
         SELECT snapshot.application_id
         FROM tournament_roster_snapshots snapshot
         WHERE snapshot.player_id = $1
       )
       SELECT
         t.id::int,
         t.slug,
         t.name,
         t.start_at,
         t.end_at,
         t.status,
         a.team_name,
         result.placement::int,
         result.result_label
       FROM participations participation
       JOIN tournament_team_applications a
         ON a.id = participation.application_id
       JOIN tournaments t
         ON t.id = a.tournament_id
       LEFT JOIN tournament_team_results result
         ON result.application_id = a.id
       WHERE a.status = 'approved'
         AND t.status IN ('active', 'finished', 'archived')
       ORDER BY t.end_at DESC, t.start_at DESC, t.id DESC`,
      [player.discord_id],
    ),
    one<{ matches: number; wins: number }>(
      `WITH player_applications AS (
         SELECT member.application_id
         FROM tournament_team_members member
         JOIN tournament_team_applications application
           ON application.id = member.application_id
         WHERE member.player_id = $1
           AND member.invitation_status = 'accepted'
           AND application.status = 'approved'
         UNION
         SELECT snapshot.application_id
         FROM tournament_roster_snapshots snapshot
         JOIN tournament_team_applications application
           ON application.id = snapshot.application_id
         WHERE snapshot.player_id = $1
           AND application.status = 'approved'
       )
       SELECT
         COUNT(played_match.id)::int AS matches,
         COUNT(played_match.id) FILTER (
           WHERE
             (
               played_match.team_a_application_id = application.application_id
               AND (
                 played_match.team_a_score > played_match.team_b_score
                 OR LOWER(played_match.team_a_result_label) = 'tw'
               )
             )
             OR
             (
               played_match.team_b_application_id = application.application_id
               AND (
                 played_match.team_b_score > played_match.team_a_score
                 OR LOWER(played_match.team_b_result_label) = 'tw'
               )
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
  const canCustomizeBackground =
    player.subscription_role !== null &&
    customizableSubscriptionRoleNames.includes(
      player.subscription_role as (typeof customizableSubscriptionRoleNames)[number],
    );
  const backgroundKey = profileBackgroundForSubscriptionRole(
    player.subscription_role,
  );
  const hasCustomBackground =
    canCustomizeBackground && player.custom_background_key !== null;
  const customBackgroundUrl = hasCustomBackground
    ? `/api/profile-backgrounds/${player.custom_background_key}`
    : null;

  return {
    dotaId: player.dota_id,
    nickname: player.nickname,
    realName: player.real_name,
    positions: player.positions,
    avatarUrl: player.avatar_url,
    subscriptionRole: player.subscription_role,
    subscriptionRoleColor: player.subscription_role_color,
    backgroundKey,
    customBackgroundUrl,
    hasCustomBackground,
    canCustomizeBackground,
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

export async function loadHallOfFame(): Promise<HallOfFamePlayer[]> {
  const rows = await query<{
    dota_id: string;
    nickname: string;
    avatar_url: string | null;
    gold: number;
    silver: number;
    bronze: number;
  }>(
    `SELECT
       player.steam_id32::text AS dota_id,
       player.ingame_name AS nickname,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       COUNT(medal.id) FILTER (WHERE medal.medal_type = 'gold')::int AS gold,
       COUNT(medal.id) FILTER (WHERE medal.medal_type = 'silver')::int AS silver,
       COUNT(medal.id) FILTER (WHERE medal.medal_type = 'bronze')::int AS bronze
     FROM players player
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     LEFT JOIN player_medals medal ON medal.player_id = player.discord_id
     GROUP BY
       player.discord_id,
       player.steam_id32,
       player.ingame_name,
       player.avatar_url,
       latest_session.discord_avatar_url
     ORDER BY
       gold DESC,
       silver DESC,
       bronze DESC,
       LOWER(player.ingame_name),
       player.discord_id`,
  );

  return rows.map((row) => ({
    dotaId: row.dota_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    medals: {
      gold: row.gold,
      silver: row.silver,
      bronze: row.bronze,
    },
  }));
}
