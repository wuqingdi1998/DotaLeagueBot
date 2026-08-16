import { one, query } from "@/lib/db";
import type { MatchingWin } from "../model/types";
import type { StarRacePendingVerification } from "../model/star-race";

type ArcanaCheckRow = {
  player_id: string;
  dota_id?: string;
  moscow_date: string;
  match_id: string;
  hero_id: number;
  opendota_job_id: string | null;
  check_after: Date;
  finished_at: Date | null;
  has_arcana: boolean | null;
};

export type ArcanaCheck = {
  playerId: string;
  dotaId?: string;
  dateKey: string;
  matchId: string;
  heroId: number;
  jobId: string | null;
  checkAfter: string;
  finishedAt: string | null;
  hasArcana: boolean | null;
};

function arcanaCheckFromRow(row: ArcanaCheckRow): ArcanaCheck {
  return {
    playerId: row.player_id,
    dotaId: row.dota_id,
    dateKey: row.moscow_date,
    matchId: row.match_id,
    heroId: Number(row.hero_id),
    jobId: row.opendota_job_id,
    checkAfter: row.check_after.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
    hasArcana: row.has_arcana,
  };
}

const arcanaCheckColumns = `
  player_id::text,
  moscow_date::text,
  match_id::text,
  hero_id,
  opendota_job_id,
  check_after,
  finished_at,
  has_arcana`;

export async function loadArcanaChecks(
  playerId: string,
  dateKey: string,
): Promise<Map<string, ArcanaCheck>> {
  const rows = await query<ArcanaCheckRow>(
    `SELECT ${arcanaCheckColumns}
     FROM compendium_star_race_arcana_checks
     WHERE player_id = $1 AND moscow_date = $2::date`,
    [playerId, dateKey],
  );
  return new Map(rows.map((row) => [row.match_id, arcanaCheckFromRow(row)]));
}

export async function loadPendingArcanaVerifications(
  playerId: string,
): Promise<Map<string, StarRacePendingVerification>> {
  const rows = await query<{
    moscow_date: string;
    check_after: Date;
    match_count: number;
  }>(
    `SELECT moscow_date::text,
       MIN(check_after) AS check_after,
       COUNT(*)::int AS match_count
     FROM compendium_star_race_arcana_checks
     WHERE player_id = $1 AND finished_at IS NULL
     GROUP BY moscow_date`,
    [playerId],
  );
  return new Map(rows.map((row) => [row.moscow_date, {
    checkAfter: row.check_after.toISOString(),
    matchCount: Number(row.match_count),
  }]));
}

export async function reserveArcanaCheck(input: {
  playerId: string;
  dateKey: string;
  win: MatchingWin;
}): Promise<{ isNew: boolean; check: ArcanaCheck }> {
  const row = await one<ArcanaCheckRow & { is_new: boolean }>(
    `WITH inserted AS (
       INSERT INTO compendium_star_race_arcana_checks
         (player_id, moscow_date, match_id, hero_id, check_after)
       VALUES ($1, $2::date, $3, $4, NOW() + INTERVAL '5 minutes')
       ON CONFLICT (player_id, moscow_date, match_id) DO NOTHING
       RETURNING ${arcanaCheckColumns}
     )
     SELECT inserted.*, TRUE AS is_new FROM inserted
     UNION ALL
     SELECT ${arcanaCheckColumns}, FALSE AS is_new
     FROM compendium_star_race_arcana_checks
     WHERE player_id = $1 AND moscow_date = $2::date AND match_id = $3
     LIMIT 1`,
    [input.playerId, input.dateKey, input.win.matchId, input.win.heroId],
  );
  if (!row) throw new Error("Arcana verification reservation was not saved");
  return { isNew: row.is_new, check: arcanaCheckFromRow(row) };
}

export async function attachArcanaParseJob(input: {
  playerId: string;
  dateKey: string;
  matchId: string;
  jobId: string;
}): Promise<void> {
  await query(
    `UPDATE compendium_star_race_arcana_checks
     SET opendota_job_id = $4, updated_at = NOW()
     WHERE player_id = $1 AND moscow_date = $2::date AND match_id = $3`,
    [input.playerId, input.dateKey, input.matchId, input.jobId],
  );
}

export async function releaseArcanaCheck(input: {
  playerId: string;
  dateKey: string;
  matchId: string;
}): Promise<void> {
  await query(
    `DELETE FROM compendium_star_race_arcana_checks
     WHERE player_id = $1 AND moscow_date = $2::date AND match_id = $3
       AND opendota_job_id IS NULL AND finished_at IS NULL`,
    [input.playerId, input.dateKey, input.matchId],
  );
}

export async function postponeArcanaCheck(input: {
  playerId: string;
  dateKey: string;
  matchId: string;
}): Promise<ArcanaCheck> {
  const row = await one<ArcanaCheckRow>(
    `UPDATE compendium_star_race_arcana_checks
     SET check_after = NOW() + INTERVAL '5 minutes', updated_at = NOW()
     WHERE player_id = $1 AND moscow_date = $2::date AND match_id = $3
       AND finished_at IS NULL
     RETURNING ${arcanaCheckColumns}`,
    [input.playerId, input.dateKey, input.matchId],
  );
  if (!row) throw new Error("Arcana verification was not postponed");
  return arcanaCheckFromRow(row);
}

export async function finishArcanaCheck(input: {
  playerId: string;
  dateKey: string;
  matchId: string;
  hasArcana: boolean;
}): Promise<void> {
  await query(
    `UPDATE compendium_star_race_arcana_checks
     SET finished_at = NOW(), has_arcana = $4, updated_at = NOW()
     WHERE player_id = $1 AND moscow_date = $2::date AND match_id = $3`,
    [input.playerId, input.dateKey, input.matchId, input.hasArcana],
  );
}

export async function saveFinishedArcanaCheck(input: {
  playerId: string;
  dateKey: string;
  win: MatchingWin;
  hasArcana: boolean;
}): Promise<void> {
  await query(
    `INSERT INTO compendium_star_race_arcana_checks
       (player_id, moscow_date, match_id, hero_id, check_after, finished_at, has_arcana)
     VALUES ($1, $2::date, $3, $4, NOW(), NOW(), $5)
     ON CONFLICT (player_id, moscow_date, match_id) DO UPDATE
     SET finished_at = NOW(), has_arcana = EXCLUDED.has_arcana, updated_at = NOW()`,
    [input.playerId, input.dateKey, input.win.matchId, input.win.heroId, input.hasArcana],
  );
}

export async function loadDueArcanaChecks(): Promise<ArcanaCheck[]> {
  const rows = await query<ArcanaCheckRow>(
    `SELECT check_row.player_id::text,
       player.steam_id32::text AS dota_id,
       check_row.moscow_date::text,
       check_row.match_id::text,
       check_row.hero_id,
       check_row.opendota_job_id,
       check_row.check_after,
       check_row.finished_at,
       check_row.has_arcana
     FROM compendium_star_race_arcana_checks check_row
     JOIN players player ON player.discord_id = check_row.player_id
     WHERE check_row.finished_at IS NULL
       AND check_row.check_after <= NOW()
       AND check_row.moscow_date >=
         (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date - 1
       AND check_row.moscow_date <=
         (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
     ORDER BY check_row.check_after
     LIMIT 50`,
  );
  return rows.map(arcanaCheckFromRow);
}
