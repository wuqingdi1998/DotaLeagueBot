import { query } from "./db";
import {
  OCTOBER_CLAN_BADGE_TEST_START_AT,
  OCTOBER_COMPENDIUM_END_AT,
} from "./october-compendium-schedule";
import { OCTOBER_CLAN_PUBLICATION_AT } from "./october-compendium-release";
import type { OctoberClanId } from "./october-clans";

export type OctoberClanBadgeDirectory = Record<string, OctoberClanId>;

type OctoberClanBadgeRow = {
  dota_id: string;
  clan_id: OctoberClanId;
};

export function octoberClanBadgeDirectoryMode(
  now: Date = new Date(),
): "hidden" | "reservation" | "assigned" {
  const currentTime = now.getTime();
  if (
    currentTime < Date.parse(OCTOBER_CLAN_BADGE_TEST_START_AT)
    || currentTime >= Date.parse(OCTOBER_COMPENDIUM_END_AT)
  ) {
    return "hidden";
  }
  return currentTime < Date.parse(OCTOBER_CLAN_PUBLICATION_AT)
    ? "reservation"
    : "assigned";
}

export async function loadOctoberClanBadgeDirectory(
  now: Date = new Date(),
): Promise<OctoberClanBadgeDirectory> {
  const mode = octoberClanBadgeDirectoryMode(now);
  if (mode === "hidden") return {};

  const rows = await query<OctoberClanBadgeRow>(
    `SELECT player.steam_id32::text AS dota_id, member.clan_id
     FROM (
       SELECT reservation.player_id, reservation.clan_id
       FROM october_compendium_clan_reservations reservation
       WHERE $1 = 'reservation'
       UNION ALL
       SELECT assigned.player_id, assigned.clan_id
       FROM october_compendium_clan_members assigned
       WHERE $1 = 'assigned'
         AND EXISTS (
           SELECT 1
           FROM october_compendium_clan_formation formation
           WHERE formation.singleton = TRUE
             AND formation.status = 'complete'
         )
     ) member
     JOIN players player ON player.discord_id = member.player_id
     WHERE player.is_archived = FALSE
       AND player.steam_id32 BETWEEN 1 AND 4294967295`,
    [mode],
  );
  return Object.fromEntries(rows.map((row) => [row.dota_id, row.clan_id]));
}
