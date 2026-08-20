import { one, query } from "@/lib/db";

export type ReplayWearable = {
  accountId: string;
  itemId: number;
};

function parseWearables(value: unknown): ReplayWearable[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const wearable = entry as Record<string, unknown>;
    if (typeof wearable.accountId !== "string" || typeof wearable.itemId !== "number") {
      return [];
    }
    return [{ accountId: wearable.accountId, itemId: wearable.itemId }];
  });
}

export async function loadReplayWearables(
  matchId: string,
): Promise<ReplayWearable[] | null> {
  const row = await one<{ wearables: unknown }>(
    `SELECT wearables
     FROM compendium_arcana_replay_results
     WHERE match_id = $1`,
    [matchId],
  );
  return row ? parseWearables(row.wearables) : null;
}

export async function saveReplayWearables(
  matchId: string,
  wearables: ReplayWearable[],
): Promise<void> {
  await query(
    `INSERT INTO compendium_arcana_replay_results (match_id, wearables)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (match_id) DO UPDATE
     SET wearables = EXCLUDED.wearables, parsed_at = NOW()`,
    [matchId, JSON.stringify(wearables)],
  );
}
