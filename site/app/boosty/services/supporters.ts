import { query } from "../../../lib/db";
import { supporterRoleId } from "../../../lib/subscription-roles";
import {
  loadDiscordSupporters,
  type Supporter,
} from "./discord-supporters";

export type SupporterDirectory = {
  supporters: Supporter[];
  isComplete: boolean;
};

type StoredSupporterRow = {
  discord_id: string;
  name: string;
  avatar_url: string | null;
};

async function loadStoredSupporters(): Promise<Supporter[]> {
  const rows = await query<StoredSupporterRow>(
    `SELECT
       player.discord_id::text,
       player.ingame_name AS name,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url
     FROM players player
     JOIN player_discord_roles role
       ON role.player_id = player.discord_id
      AND role.role_id = $1
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     WHERE player.is_archived = FALSE
     ORDER BY LOWER(player.ingame_name), player.discord_id`,
    [supporterRoleId],
  );
  return rows.map((row) => ({
    discordId: row.discord_id,
    name: row.name,
    avatarUrl: row.avatar_url,
  }));
}

export async function loadSupporterDirectory(): Promise<SupporterDirectory> {
  const discordSupporters = await loadDiscordSupporters();
  if (discordSupporters !== null) {
    return { supporters: discordSupporters, isComplete: true };
  }
  try {
    return { supporters: await loadStoredSupporters(), isComplete: false };
  } catch {
    return { supporters: [], isComplete: false };
  }
}
