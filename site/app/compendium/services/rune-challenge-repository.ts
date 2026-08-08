import type { PoolClient } from "pg";
import { one, transaction } from "@/lib/db";
import { runeChallengeAccessRoleNames } from "@/lib/subscription-roles";
import { CompendiumError } from "../model/errors";
import type { QuestCompletion } from "../model/types";
import type { DailyChallengeRewardStars } from "../model/weekend-bonus";

export type RuneChallengeSelectionRecord = {
  heroId: number;
  selectedAt: Date;
  nextChangeAt: Date;
  canChangeHero: boolean;
};

export type RuneChallengeStateRecord = {
  accessRoleName: string | null;
  selection: RuneChallengeSelectionRecord | null;
  completion: QuestCompletion | null;
};

type SelectionRow = {
  hero_id: number;
  selected_at: Date;
  next_change_at: Date;
  can_change_hero: boolean;
};

type CompletionRow = {
  hero_id: number;
  matched_match_id: string;
  completed_at: Date;
};

function selectionFromRow(row: SelectionRow): RuneChallengeSelectionRecord {
  return {
    heroId: row.hero_id,
    selectedAt: row.selected_at,
    nextChangeAt: row.next_change_at,
    canChangeHero: row.can_change_hero,
  };
}

function completionFromRow(row: CompletionRow): QuestCompletion {
  return {
    matchedHeroId: row.hero_id,
    matchedMatchId: row.matched_match_id,
    completedAt: row.completed_at.toISOString(),
  };
}

async function accessRoleWithClient(
  client: PoolClient,
  playerId: string,
): Promise<string | null> {
  const result = await client.query<{ role_name: string }>(
    `SELECT role_name
     FROM player_discord_roles
     WHERE player_id = $1
       AND role_name = ANY($2::text[])
     ORDER BY array_position($2::text[], role_name)
     LIMIT 1`,
    [playerId, runeChallengeAccessRoleNames],
  );
  return result.rows[0]?.role_name ?? null;
}

export async function loadRuneChallengeAccessRole(
  playerId: string,
): Promise<string | null> {
  const row = await one<{ role_name: string }>(
    `SELECT role_name
     FROM player_discord_roles
     WHERE player_id = $1
       AND role_name = ANY($2::text[])
     ORDER BY array_position($2::text[], role_name)
     LIMIT 1`,
    [playerId, runeChallengeAccessRoleNames],
  );
  return row?.role_name ?? null;
}

export async function loadRuneChallengeSelection(
  playerId: string,
): Promise<RuneChallengeSelectionRecord | null> {
  const row = await one<SelectionRow>(
    `SELECT hero_id, selected_at,
       selected_at + INTERVAL '7 days' AS next_change_at,
       selected_at + INTERVAL '7 days' <= NOW() AS can_change_hero
     FROM compendium_rune_challenge_selections
     WHERE player_id = $1`,
    [playerId],
  );
  return row ? selectionFromRow(row) : null;
}

export async function loadRuneChallengeCompletion(
  playerId: string,
  dateKey: string,
): Promise<QuestCompletion | null> {
  const row = await one<CompletionRow>(
    `SELECT hero_id, matched_match_id::text, completed_at
     FROM compendium_rune_challenge_completions
     WHERE player_id = $1 AND moscow_date = $2::date`,
    [playerId, dateKey],
  );
  return row ? completionFromRow(row) : null;
}

export async function loadRuneChallengeStateRecord(
  playerId: string,
  dateKey: string,
): Promise<RuneChallengeStateRecord> {
  const [accessRoleName, selection, completion] = await Promise.all([
    loadRuneChallengeAccessRole(playerId),
    loadRuneChallengeSelection(playerId),
    loadRuneChallengeCompletion(playerId, dateKey),
  ]);
  return { accessRoleName, selection, completion };
}

export async function saveRuneChallengeSelection(input: {
  playerId: string;
  heroId: number;
}): Promise<RuneChallengeSelectionRecord> {
  return transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-rune-selection:${input.playerId}`],
    );
    if (!(await accessRoleWithClient(client, input.playerId))) {
      throw new CompendiumError(
        "RUNE_ACCESS_REQUIRED",
        "Испытание Рун недоступно для вашей текущей роли",
      );
    }
    const current = await client.query<SelectionRow>(
      `SELECT hero_id, selected_at,
         selected_at + INTERVAL '7 days' AS next_change_at,
         selected_at + INTERVAL '7 days' <= NOW() AS can_change_hero
       FROM compendium_rune_challenge_selections
       WHERE player_id = $1
       FOR UPDATE`,
      [input.playerId],
    );
    if (current.rowCount && !current.rows[0].can_change_hero) {
      throw new CompendiumError(
        "RUNE_HERO_LOCKED",
        `Любимого героя можно сменить после ${current.rows[0].next_change_at.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
      );
    }
    const saved = await client.query<SelectionRow>(
      `INSERT INTO compendium_rune_challenge_selections
         (player_id, hero_id, selected_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (player_id) DO UPDATE
       SET hero_id = EXCLUDED.hero_id, selected_at = EXCLUDED.selected_at
       RETURNING hero_id, selected_at,
         selected_at + INTERVAL '7 days' AS next_change_at,
         FALSE AS can_change_hero`,
      [input.playerId, input.heroId],
    );
    return selectionFromRow(saved.rows[0]);
  });
}

export async function recordRuneChallengeCompletion(input: {
  playerId: string;
  dateKey: string;
  heroId: number;
  matchId: string;
  rewardStars: DailyChallengeRewardStars;
}): Promise<QuestCompletion> {
  return transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-rune-completion:${input.playerId}:${input.dateKey}`],
    );
    if (!(await accessRoleWithClient(client, input.playerId))) {
      throw new CompendiumError(
        "RUNE_ACCESS_REQUIRED",
        "Испытание Рун недоступно для вашей текущей роли",
      );
    }
    const selection = await client.query<{ hero_id: number }>(
      `SELECT hero_id
       FROM compendium_rune_challenge_selections
       WHERE player_id = $1
       FOR SHARE`,
      [input.playerId],
    );
    if (!selection.rowCount || selection.rows[0].hero_id !== input.heroId) {
      throw new CompendiumError(
        "RUNE_HERO_REQUIRED",
        "Сначала выберите любимого героя",
      );
    }
    const inserted = await client.query<CompletionRow>(
      `INSERT INTO compendium_rune_challenge_completions
        (player_id, moscow_date, hero_id, matched_match_id, reward_amount)
       SELECT $1, $2::date, $3, $4, $5
       WHERE $2::date =
         (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
       ON CONFLICT DO NOTHING
       RETURNING hero_id, matched_match_id::text, completed_at`,
      [
        input.playerId,
        input.dateKey,
        input.heroId,
        input.matchId,
        input.rewardStars,
      ],
    );
    if (inserted.rowCount) return completionFromRow(inserted.rows[0]);
    const existing = await client.query<CompletionRow>(
      `SELECT hero_id, matched_match_id::text, completed_at
       FROM compendium_rune_challenge_completions
       WHERE player_id = $1 AND moscow_date = $2::date`,
      [input.playerId, input.dateKey],
    );
    if (!existing.rowCount) {
      throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
    }
    return completionFromRow(existing.rows[0]);
  });
}
