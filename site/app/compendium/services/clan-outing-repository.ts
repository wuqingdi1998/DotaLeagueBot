import type { PoolClient } from "pg";
import { one, query, transaction } from "@/lib/db";
import { moscowDayBounds } from "../model/time";

export type ClanOutingCompletion = {
  matchId: string;
  partnerPlayerId: string;
  partnerName: string;
  completedAt: string;
};

type CompletionRow = {
  matched_match_id: string;
  partner_player_id: string;
  partner_name: string;
  completed_at: Date;
};

function completionFromRow(row: CompletionRow): ClanOutingCompletion {
  return {
    matchId: row.matched_match_id,
    partnerPlayerId: row.partner_player_id,
    partnerName: row.partner_name,
    completedAt: row.completed_at.toISOString(),
  };
}

export async function loadClanOutingCompletion(
  playerId: string,
  dateKey: string,
): Promise<ClanOutingCompletion | null> {
  const row = await one<CompletionRow>(
    `SELECT completion.matched_match_id::text,
       completion.partner_player_id::text,
       partner.ingame_name AS partner_name,
       completion.completed_at
     FROM october_compendium_clan_outing_completions completion
     JOIN players partner ON partner.discord_id = completion.partner_player_id
     WHERE completion.player_id = $1 AND completion.moscow_date = $2::date`,
    [playerId, dateKey],
  );
  return row ? completionFromRow(row) : null;
}

export async function loadClanMateDotaIds(playerId: string): Promise<Map<string, {
  playerId: string;
  playerName: string;
}>> {
  const rows = await query<{ player_id: string; dota_id: string; player_name: string }>(
    `SELECT mate.player_id::text, player.steam_id32::text AS dota_id,
       player.ingame_name AS player_name
     FROM october_compendium_clan_members member
     JOIN october_compendium_clan_members mate
       ON mate.clan_id = member.clan_id AND mate.player_id <> member.player_id
     JOIN players player ON player.discord_id = mate.player_id
     WHERE member.player_id = $1 AND player.is_archived = FALSE`,
    [playerId],
  );
  return new Map(rows.map((row) => [row.dota_id, {
    playerId: row.player_id,
    playerName: row.player_name,
  }]));
}

async function insertCompletion(client: PoolClient, input: {
  playerId: string;
  partnerPlayerId: string;
  dateKey: string;
  matchId: string;
  rewardStars: 1 | 2;
}): Promise<boolean> {
  const inserted = await client.query(
    `INSERT INTO october_compendium_clan_outing_completions
       (player_id, partner_player_id, moscow_date, matched_match_id, reward_amount, completed_at)
     VALUES ($1, $2, $3::date, $4, $5, $6::timestamptz)
     ON CONFLICT (player_id, moscow_date) DO NOTHING
     RETURNING player_id`,
    [input.playerId, input.partnerPlayerId, input.dateKey, input.matchId, input.rewardStars,
      new Date(Math.min(Date.now(), moscowDayBounds(input.dateKey).end.getTime() - 1)).toISOString()],
  );
  if (inserted.rowCount) {
    await client.query(
      `UPDATE october_compendium_clan_members
       SET total_points = total_points + $2 WHERE player_id = $1`,
      [input.playerId, input.rewardStars],
    );
  }
  return Boolean(inserted.rowCount);
}

export async function recordClanOutingPair(input: {
  playerId: string;
  partnerPlayerId: string;
  dateKey: string;
  matchId: string;
  rewardStars: 1 | 2;
}): Promise<ClanOutingCompletion> {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `october-clan-outing:${input.matchId}`,
    ]);
    await insertCompletion(client, input);
    await insertCompletion(client, {
      ...input,
      playerId: input.partnerPlayerId,
      partnerPlayerId: input.playerId,
    });
  });
  const completion = await loadClanOutingCompletion(input.playerId, input.dateKey);
  if (!completion) throw new Error("Clan outing completion was not saved");
  return completion;
}
