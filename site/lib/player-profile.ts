import { one, query } from "./db";
import {
  loadPlayerTournamentHistory,
  type PlayerTournamentHistory,
} from "./player-tournament-history";
import {
  loadPlayerMapStatistics,
  type PlayerTournamentMapStatistics,
} from "./player-map-statistics";
import {
  selectProfileBadgesForDisplay,
  type ProfileBadgeKey,
} from "./profile-badges";
import {
  customizableSubscriptionRoleNames,
  subscriptionRoleNames,
} from "./subscription-roles";
import { buildPlayerLinks, normalizeDotaAccountId } from "./player-links";

export { buildPlayerLinks, normalizeDotaAccountId } from "./player-links";

export {
  customizableSubscriptionRoleNames,
  subscriptionRoleNames,
} from "./subscription-roles";

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
  customBackgroundMobileUrl: string | null;
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
    maps: number;
    mapWins: number;
  };
  mapStatisticsByTournament: PlayerTournamentMapStatistics[];
  medals: PlayerMedals;
  profileBadges: ProfileBadgeKey[];
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
  custom_background_mobile_key: string | null;
};

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
       preference.custom_background_key,
       preference.custom_background_mobile_key
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
     WHERE p.steam_id32 = $1
       AND p.is_archived = FALSE`,
    [dotaId],
  );
  if (!player) return null;
  const identityMembers = await query<{ player_id: string }>(
    `SELECT related.player_id::text
     FROM player_identity_members own_member
     JOIN player_identity_members related
       ON related.identity_id = own_member.identity_id
     WHERE own_member.player_id = $1
     ORDER BY related.player_id`,
    [player.discord_id],
  );
  const playerIds = identityMembers.length
    ? identityMembers.map((member) => member.player_id)
    : [player.discord_id];

  const [tournamentHistory, mapStatistics, medalCounts, storedProfileBadges] = await Promise.all([
    loadPlayerTournamentHistory(playerIds, player.nickname),
    loadPlayerMapStatistics(playerIds),
    one<PlayerMedals>(
      `SELECT
         COUNT(*) FILTER (WHERE medal_type = 'gold')::int AS gold,
         COUNT(*) FILTER (WHERE medal_type = 'silver')::int AS silver,
         COUNT(*) FILTER (WHERE medal_type = 'bronze')::int AS bronze
       FROM player_medals
       WHERE player_id = ANY($1::bigint[])`,
      [playerIds],
    ),
    query<{ badge_key: string }>(
       `SELECT badge_key
       FROM player_profile_badges
       WHERE player_id = ANY($1::bigint[])
       ORDER BY awarded_at DESC, badge_key`,
      [playerIds],
    ),
  ]);

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
  const customBackgroundMobileUrl = hasCustomBackground
    ? player.custom_background_mobile_key
      ? `/api/profile-backgrounds/${player.custom_background_mobile_key}`
      : customBackgroundUrl
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
    customBackgroundMobileUrl,
    hasCustomBackground,
    canCustomizeBackground,
    links: buildPlayerLinks(player.dota_id),
    statistics: {
      tournaments: tournamentHistory.length,
      tournamentWins,
      podiums,
      maps: mapStatistics.maps,
      mapWins: mapStatistics.mapWins,
    },
    mapStatisticsByTournament: mapStatistics.tournaments,
    medals: medalCounts ?? { gold: 0, silver: 0, bronze: 0 },
    profileBadges: selectProfileBadgesForDisplay(
      storedProfileBadges.map((badge) => badge.badge_key),
    ),
    lastTournament: tournamentHistory[0] ?? null,
    tournamentHistory,
  };
}
