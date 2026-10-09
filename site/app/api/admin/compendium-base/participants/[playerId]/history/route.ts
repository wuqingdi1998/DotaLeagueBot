import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { loadCompendiumAdminParticipantHistory } from "@/app/compendium/admin/repository";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ playerId: string }> },
) {
  try {
    await requireAdmin();
    const { playerId } = await context.params;
    if (!/^\d{1,20}$/.test(playerId)) {
      return Response.json({ error: "Некорректный участник" }, { status: 400 });
    }
    const rewards = await loadCompendiumAdminParticipantHistory(playerId);
    if (!rewards) {
      return Response.json({ error: "Участник не найден" }, { status: 404 });
    }
    const audits = await query<{ history_id: string; match_ids: string[]; administrator_name: string }>(
      `SELECT (CASE audit.challenge_kind WHEN 'daily' THEN 'quest' ELSE audit.challenge_kind END)
          || ':' || audit.completion_id::text AS history_id,
        ARRAY(SELECT match_id::text FROM unnest(audit.match_ids) match_id) AS match_ids,
        COALESCE(administrator.ingame_name, 'Организатор') AS administrator_name
       FROM october_compendium_manual_completion_audit audit
       LEFT JOIN players administrator ON administrator.discord_id = audit.administered_by
       WHERE audit.player_id = $1`, [playerId]);
    return Response.json({ rewards: rewards.map((reward) => {
      const audit = audits.find((audit) => audit.history_id === reward.id);
      return audit ? { ...reward, isManual: true, administratorName: audit.administrator_name,
        manualMatchIds: audit.match_ids } : reward;
    }) });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
