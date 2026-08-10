import { query } from "@/lib/db";

type CandidateRow = {
  player_id: string;
  dota_id: string;
  player_name: string;
};

export type UnrewardedStarRaceCandidate = {
  playerId: string;
  dotaId: string;
  playerName: string;
};

export async function loadUnrewardedStarRaceCandidates(
  dateKey: string,
): Promise<UnrewardedStarRaceCandidate[]> {
  const rows = await query<CandidateRow>(
    `SELECT player.discord_id::text AS player_id,
       player.steam_id32::text AS dota_id,
       player.ingame_name AS player_name
     FROM players player
     WHERE player.is_archived = FALSE
       AND player.steam_id32 BETWEEN 1 AND 4294967295
       AND NOT EXISTS (
         SELECT 1
         FROM compendium_star_race_quest_completions completion
         WHERE completion.player_id = player.discord_id
           AND completion.moscow_date = $1::date
       )
     ORDER BY LOWER(player.ingame_name), player.discord_id`,
    [dateKey],
  );
  return rows.map((row) => ({
    playerId: row.player_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
  }));
}

export async function loadRewardedStarRacePlayerIds(
  dateKey: string,
  playerIds: string[],
): Promise<Set<string>> {
  if (playerIds.length === 0) return new Set();
  const rows = await query<{ player_id: string }>(
    `SELECT player_id::text
     FROM compendium_star_race_quest_completions
     WHERE moscow_date = $1::date
       AND player_id = ANY($2::bigint[])`,
    [dateKey, playerIds],
  );
  return new Set(rows.map((row) => row.player_id));
}
