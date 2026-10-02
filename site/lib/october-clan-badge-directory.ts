import { query } from "./db";
import { OCTOBER_COMPENDIUM_END_AT } from "./october-compendium-schedule";
import { OCTOBER_CLAN_PUBLICATION_AT } from "./october-compendium-release";
import type { OctoberClanId } from "./october-clans";

export type OctoberClanBadgeDirectory = Record<string, OctoberClanId>;

type OctoberClanBadgeRow = {
  dota_id: string;
  clan_id: OctoberClanId;
};

export function isOctoberClanBadgeWindow(now: Date = new Date()): boolean {
  const currentTime = now.getTime();
  return currentTime >= Date.parse(OCTOBER_CLAN_PUBLICATION_AT)
    && currentTime < Date.parse(OCTOBER_COMPENDIUM_END_AT);
}

export async function loadOctoberClanBadgeDirectory(
  now: Date = new Date(),
): Promise<OctoberClanBadgeDirectory> {
  if (!isOctoberClanBadgeWindow(now)) return {};

  const rows = await query<OctoberClanBadgeRow>(
    `SELECT player.steam_id32::text AS dota_id, member.clan_id
     FROM october_compendium_clan_members member
     JOIN october_compendium_clan_formation formation
       ON formation.singleton = TRUE
      AND formation.status = 'complete'
     JOIN players player ON player.discord_id = member.player_id
     WHERE player.is_archived = FALSE
       AND player.steam_id32 BETWEEN 1 AND 4294967295`,
  );
  return Object.fromEntries(rows.map((row) => [row.dota_id, row.clan_id]));
}
