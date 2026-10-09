import { query } from "@/lib/db";
import type { OctoberClanMember } from "../model/clan-members";
import { octoberCompendiumPhase } from "../model/release";
import { loadOctoberFormationStatus } from "./clan-formation-repository";

type OctoberClanMemberRow = {
  player_id: string;
  dota_id: string;
  player_name: string;
  avatar_url: string | null;
  clan_id: OctoberClanMember["clanId"];
  total_points: number;
};

export async function loadOctoberClanMembers(
  now: Date = new Date(),
): Promise<OctoberClanMember[]> {
  const phase = octoberCompendiumPhase(now);
  const isPublished = (phase === "published" || phase === "finished") &&
    await loadOctoberFormationStatus() === "complete";
  const rows = await query<OctoberClanMemberRow>(
    `SELECT
       member.player_id::text,
       player.steam_id32::text AS dota_id,
       player.ingame_name AS player_name,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       member.clan_id,
       member.total_points::int
     FROM ${isPublished
       ? "october_compendium_clan_members"
       : `(SELECT player_id, clan_id, 0 AS total_points
           FROM october_compendium_clan_reservations)`} member
     JOIN players player ON player.discord_id = member.player_id
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     WHERE player.is_archived = FALSE
       AND october_clan_player_is_eligible(member.player_id)
     ORDER BY
       member.clan_id,
       member.total_points DESC,
       LOWER(player.ingame_name),
       member.player_id`,
  );
  return rows.map((row) => ({
    discordId: row.player_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    avatarUrl: row.avatar_url,
    clanId: row.clan_id,
    totalPoints: Number(row.total_points),
  }));
}
