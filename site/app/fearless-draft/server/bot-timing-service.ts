import { randomInt } from "node:crypto";
import { one, query } from "@/lib/db";
import { randomBotDueAt, BOT_DECISION_WINDOW_SECONDS } from "../model/bot-timing";

export async function isBotActionDue(mapId: number, key: string, deadline: Date | null): Promise<boolean> {
  const clock = await one<{ now: Date }>("SELECT NOW() AS now");
  if (!clock) return false;
  const now = clock.now.getTime();
  const dueAt = new Date(randomBotDueAt(now, deadline?.getTime() ?? now + BOT_DECISION_WINDOW_SECONDS * 1_000,
    () => randomInt(1_000_000) / 1_000_000));
  const result = await query<{ is_due: boolean }>(
    `UPDATE draft_maps SET
       bot_action_due_at = CASE WHEN bot_action_key IS DISTINCT FROM $2 THEN $3 ELSE bot_action_due_at END,
       bot_action_key = $2
     WHERE id = $1 AND (bot_action_key IS DISTINCT FROM $2 OR bot_action_due_at IS NULL)
     RETURNING bot_action_due_at <= NOW() AS is_due`,
    [mapId, key, dueAt],
  );
  if (result.length) return result[0].is_due;
  const existing = await one<{ is_due: boolean }>("SELECT bot_action_due_at <= NOW() AS is_due FROM draft_maps WHERE id = $1 AND bot_action_key = $2", [mapId, key]);
  return existing?.is_due === true;
}

export async function clearBotActionDue(mapId: number, key: string) {
  await query("UPDATE draft_maps SET bot_action_due_at = NULL, bot_action_key = NULL WHERE id = $1 AND bot_action_key = $2", [mapId, key]);
}

export async function nextBotActionDueAt(): Promise<Date | null> {
  const result = await one<{ deadline: Date | null }>(
    `SELECT MIN(deadline) AS deadline FROM (
       SELECT map.bot_action_due_at AS deadline FROM draft_maps map
       JOIN draft_series series ON series.id = map.series_id AND series.current_map = map.map_number
       WHERE series.status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
       UNION ALL
       SELECT (lobby.state->'room'->>'captainStageDeadlineAt')::timestamptz
       FROM draft_bot3_lobbies lobby JOIN draft_series series ON series.id = lobby.series_id
       WHERE series.status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
         AND lobby.state->'room'->>'status' <> 'drafting'
       UNION ALL
       SELECT to_timestamp(due.value::double precision / 1000)
       FROM draft_bot3_lobbies lobby JOIN draft_series series ON series.id = lobby.series_id,
            jsonb_each_text(lobby.state->'dueAt') due
       WHERE series.status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
     ) pending WHERE deadline IS NOT NULL`,
  );
  return result?.deadline ?? null;
}
