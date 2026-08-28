import type { AuthUser } from "@/lib/auth";
import type { PoolClient } from "pg";
import { FEARLESS_DRAFT_BOT_PLAYER_ID } from "../model/bot";
import {
  buildLobbyPreviewRoster,
  type LobbyPreviewProfile,
} from "../model/lobby-preview";
import type { DraftLobbyPlayer } from "../model/snapshot";
import { DraftRequestError } from "./errors";

type LobbyPreviewProfileRow = {
  id: string;
  dota_id: string;
  name: string;
  avatar_url: string | null;
};

export async function loadLobbyPreviewPlayers(
  client: PoolClient,
  user: AuthUser,
  seriesId: number,
): Promise<DraftLobbyPlayer[]> {
  const result = await client.query<LobbyPreviewProfileRow>(
    `SELECT player.discord_id::text AS id,
            player.steam_id32::text AS dota_id,
            player.ingame_name AS name,
            COALESCE(
              NULLIF(player.avatar_url, ''),
              NULLIF(latest.discord_avatar_url, '')
            ) AS avatar_url
     FROM players player
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
       ORDER BY session.created_at DESC LIMIT 1
     ) latest ON TRUE
     WHERE player.is_archived = FALSE
       AND player.discord_id <> $1
       AND player.steam_id32 BETWEEN 1 AND 4294967295
     ORDER BY md5(player.discord_id::text || ':' || $2::text)
     LIMIT 9`,
    [user.discordId, seriesId],
  );
  if (result.rows.length !== 9) {
    throw new DraftRequestError(
      "Для предпросмотра лобби не хватает профилей участников",
      409,
    );
  }
  const profiles: LobbyPreviewProfile[] = result.rows.map((row) => ({
    id: row.id,
    dotaId: row.dota_id,
    name: row.name,
    avatarUrl: row.avatar_url,
  }));
  return buildLobbyPreviewRoster({
    viewer: {
      id: user.discordId,
      dotaId: user.dotaId,
      name: user.serverName,
      avatarUrl: user.avatarUrl,
    },
    profiles,
    botCaptainId: FEARLESS_DRAFT_BOT_PLAYER_ID,
  });
}
