import type { PoolClient } from "pg";
import { one, query, transaction } from "@/lib/db";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import { CompendiumError } from "../model/errors";
import type { MatchingWin } from "../model/types";
import {
  CURRENT_STAR_RACE,
  starRaceWeekByDate,
  type StarRaceQuestCompletion,
  type StarRaceQuestWin,
  type StarRaceWeekDefinition,
} from "../model/star-race";
import { compendiumHeroById } from "../model/heroes";

type StarRaceCompletionRow = {
  completion_id: string;
  moscow_date: string;
  completed_at: Date;
  hero_id: number | null;
  matched_match_id: string | null;
};

type StarRaceLeaderboardRow = {
  rank: number;
  player_id: string;
  dota_id: string;
  player_name: string;
  avatar_url: string | null;
  total_stars: number;
  completed_race_quests: number;
};

type StarRaceRankRow = {
  rank: number;
};

type StarRaceProgressRow = {
  moscow_date: string;
  progress_amount: string | number;
  checked_at: Date;
  hero_id: number | null;
  matched_match_id: string | null;
};

export type StarRaceCompletionByDate = Map<
  string,
  StarRaceQuestCompletion
>;

export type StarRaceProgressByDate = Map<
  string,
  { current: number; checkedAt: string; wins: StarRaceQuestWin[] }
>;

function completionsFromRows(
  rows: StarRaceCompletionRow[],
): StarRaceCompletionByDate {
  const completions = new Map<string, StarRaceQuestCompletion>();
  for (const row of rows) {
    const completion = completions.get(row.moscow_date) ?? {
      completedAt: row.completed_at.toISOString(),
      wins: [],
    };
    if (row.hero_id !== null && row.matched_match_id !== null) {
      completion.wins.push({
        hero: compendiumHeroById(row.hero_id),
        matchId: row.matched_match_id,
      });
    }
    completions.set(row.moscow_date, completion);
  }
  return completions;
}

const completionSelect = `
  SELECT
    completion.id::text AS completion_id,
    completion.moscow_date::text,
    completion.completed_at,
    win.hero_id,
    win.matched_match_id::text
  FROM compendium_star_race_quest_completions completion
  LEFT JOIN compendium_star_race_quest_wins win
    ON win.completion_id = completion.id
  WHERE completion.player_id = $1
    AND ($2::date IS NULL OR completion.moscow_date = $2::date)
  ORDER BY completion.moscow_date, win.position`;

export async function loadStarRaceCompletions(
  playerId: string,
): Promise<StarRaceCompletionByDate> {
  return completionsFromRows(
    await query<StarRaceCompletionRow>(completionSelect, [playerId, null]),
  );
}

export async function existingStarRaceCompletion(
  playerId: string,
  dateKey: string,
): Promise<StarRaceQuestCompletion | null> {
  const rows = await query<StarRaceCompletionRow>(completionSelect, [
    playerId,
    dateKey,
  ]);
  return completionsFromRows(rows).get(dateKey) ?? null;
}

export async function loadStarRaceProgress(
  playerId: string,
): Promise<StarRaceProgressByDate> {
  const rows = await query<StarRaceProgressRow>(
    `SELECT progress.moscow_date::text,
       progress.progress_amount,
       progress.checked_at,
       win.hero_id,
       win.matched_match_id::text
     FROM compendium_star_race_quest_progress progress
     LEFT JOIN compendium_star_race_quest_progress_wins win
       ON win.player_id = progress.player_id
      AND win.moscow_date = progress.moscow_date
     WHERE progress.player_id = $1
     ORDER BY progress.moscow_date, win.position`,
    [playerId],
  );
  const progressByDate: StarRaceProgressByDate = new Map();
  for (const row of rows) {
    const progress = progressByDate.get(row.moscow_date) ?? {
      current: Number(row.progress_amount),
      checkedAt: row.checked_at.toISOString(),
      wins: [],
    };
    if (row.hero_id !== null && row.matched_match_id !== null) {
      progress.wins.push({
        hero: compendiumHeroById(row.hero_id),
        matchId: row.matched_match_id,
      });
    }
    progressByDate.set(row.moscow_date, progress);
  }
  return progressByDate;
}

export async function loadPersonalStarRaceStars(
  playerId: string,
  race: StarRaceWeekDefinition = CURRENT_STAR_RACE,
): Promise<number> {
  const row = await one<{ total: number }>(
    `SELECT GREATEST(0, COALESCE(SUM(event.amount), 0))::int AS total
     FROM compendium_star_race_events event
     WHERE event.earned_at >= $1::timestamptz
       AND event.earned_at < $2::timestamptz
       AND event.player_id = $3`,
    [race.startsAt, race.endsAt, playerId],
  );
  return row?.total ?? 0;
}

const eligibleStarRaceTotalsCte = `WITH race_totals AS (
  SELECT
    event.player_id,
    GREATEST(0, SUM(event.amount))::int AS total_stars
  FROM compendium_star_race_events event
  WHERE event.earned_at >= $1::timestamptz
    AND event.earned_at < $2::timestamptz
  GROUP BY event.player_id
), race_quest_counts AS (
  SELECT
    completion.player_id,
    COUNT(*)::int AS completed_race_quests
  FROM compendium_star_race_quest_completions completion
  WHERE completion.moscow_date >=
      ($1::timestamptz AT TIME ZONE 'Europe/Moscow')::date
    AND completion.moscow_date <
      ($2::timestamptz AT TIME ZONE 'Europe/Moscow')::date
  GROUP BY completion.player_id
), eligible_race_totals AS (
  SELECT
    race_total.player_id,
    race_total.total_stars,
    COALESCE(quest_count.completed_race_quests, 0)::int
      AS completed_race_quests
  FROM race_totals race_total
  JOIN players player ON player.discord_id = race_total.player_id
  LEFT JOIN race_quest_counts quest_count
    ON quest_count.player_id = race_total.player_id
  WHERE race_total.total_stars > 0
    AND ($3::boolean OR player.is_archived = FALSE)
    AND player.steam_id32 BETWEEN 1 AND 4294967295
)`;

const rankedStarRaceTotalsCte = `${eligibleStarRaceTotalsCte}, ranked_race_totals AS (
  SELECT
    eligible_total.player_id,
    eligible_total.total_stars,
    eligible_total.completed_race_quests,
    (ROW_NUMBER() OVER (
      ORDER BY
        eligible_total.total_stars DESC,
        eligible_total.completed_race_quests DESC,
        COALESCE(tiebreak.rolls, ARRAY[]::SMALLINT[]) DESC,
        eligible_total.player_id
    ))::int AS rank
  FROM eligible_race_totals eligible_total
  LEFT JOIN compendium_star_race_tiebreak_rolls tiebreak
    ON tiebreak.race_start_at = $1::timestamptz
   AND tiebreak.player_id = eligible_total.player_id
)`;

async function ensureStarRaceTiebreakRolls(
  race: StarRaceWeekDefinition,
  includeArchivedPlayers: boolean,
): Promise<void> {
  await query(
    `${eligibleStarRaceTotalsCte}
     INSERT INTO compendium_star_race_tiebreak_rolls
       (race_start_at, player_id, rolls)
     SELECT
       $1::timestamptz,
       eligible_total.player_id,
       ARRAY_AGG(
         (FLOOR(RANDOM() * 20) + 1)::smallint
         ORDER BY roll_number
       )
     FROM eligible_race_totals eligible_total
     CROSS JOIN generate_series(1, 64) roll_number
     GROUP BY eligible_total.player_id
     ON CONFLICT (race_start_at, player_id) DO NOTHING`,
    [race.startsAt, race.endsAt, includeArchivedPlayers],
  );
}

export async function loadStarRaceRank(
  playerId: string,
  race: StarRaceWeekDefinition = CURRENT_STAR_RACE,
): Promise<number | null> {
  await ensureStarRaceTiebreakRolls(race, false);
  const row = await one<StarRaceRankRow>(
    `${rankedStarRaceTotalsCte}
     SELECT ranked_total.rank
     FROM ranked_race_totals ranked_total
     WHERE ranked_total.player_id = $4`,
    [race.startsAt, race.endsAt, false, playerId],
  );
  return row ? Number(row.rank) : null;
}

export async function loadStarRaceLeaderboard(
  race: StarRaceWeekDefinition = CURRENT_STAR_RACE,
  includeArchivedPlayers = false,
): Promise<
  CompendiumLeaderboardEntry[]
> {
  await ensureStarRaceTiebreakRolls(race, includeArchivedPlayers);
  const rows = await query<StarRaceLeaderboardRow>(
    `${rankedStarRaceTotalsCte}
     SELECT
       ranked_total.rank,
       player.discord_id::text AS player_id,
       player.steam_id32::text AS dota_id,
       player.ingame_name AS player_name,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       ranked_total.total_stars,
       ranked_total.completed_race_quests
     FROM ranked_race_totals ranked_total
     JOIN players player ON player.discord_id = ranked_total.player_id
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     ORDER BY ranked_total.rank`,
    [race.startsAt, race.endsAt, includeArchivedPlayers],
  );
  return rows.map((row) => ({
    rank: Number(row.rank),
    playerId: row.player_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    avatarUrl: row.avatar_url,
    totalStars: Number(row.total_stars),
    completedQuests: Number(row.completed_race_quests),
  }));
}

async function completionFromClient(
  client: PoolClient,
  playerId: string,
  dateKey: string,
): Promise<StarRaceQuestCompletion | null> {
  const result = await client.query<StarRaceCompletionRow>(completionSelect, [
    playerId,
    dateKey,
  ]);
  return completionsFromRows(result.rows).get(dateKey) ?? null;
}

async function assertActiveStarRaceDate(
  client: PoolClient,
  dateKey: string,
): Promise<void> {
  const race = starRaceWeekByDate(dateKey);
  if (!race) {
    throw new CompendiumError(
      "STAR_RACE_NOT_ACTIVE",
      "Задание не относится ни к одной сохранённой неделе Гонки.",
    );
  }
  const activeDate = await client.query(
    `SELECT 1
     WHERE $1::date =
       (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
       AND CURRENT_TIMESTAMP >= $2::timestamptz
       AND CURRENT_TIMESTAMP < $3::timestamptz`,
    [dateKey, race.startsAt, race.endsAt],
  );
  if (!activeDate.rowCount) {
    throw new CompendiumError(
      "STAR_RACE_NOT_ACTIVE",
      "Задание доступно только в назначенный день по московскому времени.",
    );
  }
}

export async function replaceStarRaceProgress(input: {
  playerId: string;
  dateKey: string;
  current: number;
}): Promise<void> {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `compendium-star-race:${input.playerId}:${input.dateKey}`,
    ]);
    await assertActiveStarRaceDate(client, input.dateKey);
    await client.query(
      `INSERT INTO compendium_star_race_quest_progress
         (player_id, moscow_date, progress_amount, checked_at)
       VALUES ($1, $2::date, $3, NOW())
       ON CONFLICT (player_id, moscow_date) DO UPDATE
       SET progress_amount = EXCLUDED.progress_amount,
           checked_at = EXCLUDED.checked_at`,
      [input.playerId, input.dateKey, input.current],
    );
  });
}

export async function replaceStarRaceHeroProgress(input: {
  playerId: string;
  dateKey: string;
  wins: MatchingWin[];
}): Promise<void> {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `compendium-star-race:${input.playerId}:${input.dateKey}`,
    ]);
    await assertActiveStarRaceDate(client, input.dateKey);
    await client.query(
      `INSERT INTO compendium_star_race_quest_progress
         (player_id, moscow_date, progress_amount, checked_at)
       VALUES ($1, $2::date, $3, NOW())
       ON CONFLICT (player_id, moscow_date) DO UPDATE
       SET progress_amount = EXCLUDED.progress_amount,
           checked_at = EXCLUDED.checked_at`,
      [input.playerId, input.dateKey, input.wins.length],
    );
    await client.query(
      `DELETE FROM compendium_star_race_quest_progress_wins
       WHERE player_id = $1 AND moscow_date = $2::date`,
      [input.playerId, input.dateKey],
    );
    for (const [index, win] of input.wins.entries()) {
      await client.query(
        `INSERT INTO compendium_star_race_quest_progress_wins
           (player_id, moscow_date, position, hero_id, matched_match_id)
         VALUES ($1, $2::date, $3, $4, $5)`,
        [input.playerId, input.dateKey, index + 1, win.heroId, win.matchId],
      );
    }
  });
}

export async function recordStarRaceCompletion(input: {
  playerId: string;
  dateKey: string;
  rewardStars: number;
  wins: MatchingWin[];
}): Promise<StarRaceQuestCompletion> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `compendium-star-race:${input.playerId}:${input.dateKey}`,
    ]);
    const completed = await completionFromClient(
      client,
      input.playerId,
      input.dateKey,
    );
    if (completed) return completed;

    await assertActiveStarRaceDate(client, input.dateKey);

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO compendium_star_race_quest_completions
         (player_id, moscow_date, reward_amount)
       VALUES ($1, $2::date, $3)
       ON CONFLICT (player_id, moscow_date) DO NOTHING
       RETURNING id::text`,
      [input.playerId, input.dateKey, input.rewardStars],
    );
    if (inserted.rowCount) {
      const completionId = inserted.rows[0].id;
      for (const [index, win] of input.wins.entries()) {
        await client.query(
          `INSERT INTO compendium_star_race_quest_wins
             (completion_id, player_id, position, hero_id, matched_match_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [completionId, input.playerId, index + 1, win.heroId, win.matchId],
        );
      }
    }
    const saved = await completionFromClient(
      client,
      input.playerId,
      input.dateKey,
    );
    if (!saved) throw new Error("Star race completion was not saved");
    return saved;
  });
}
