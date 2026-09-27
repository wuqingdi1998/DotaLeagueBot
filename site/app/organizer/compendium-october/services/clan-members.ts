import { query } from "@/lib/db";
import type { OctoberClanMember } from "../model/clan-members";

type OctoberClanMemberRow = {
  player_id: string;
  dota_id: string;
  player_name: string;
  clan_id: OctoberClanMember["clanId"];
};

export async function loadOctoberClanMembers(): Promise<OctoberClanMember[]> {
  const rows = await query<OctoberClanMemberRow>(
    `SELECT
       member.player_id::text,
       player.steam_id32::text AS dota_id,
       player.ingame_name AS player_name,
       member.clan_id
     FROM october_compendium_clan_members member
     JOIN players player ON player.discord_id = member.player_id
     WHERE player.is_archived = FALSE
     ORDER BY member.clan_id, LOWER(player.ingame_name), member.player_id`,
  );
  return rows.map((row) => ({
    discordId: row.player_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    clanId: row.clan_id,
  }));
}
