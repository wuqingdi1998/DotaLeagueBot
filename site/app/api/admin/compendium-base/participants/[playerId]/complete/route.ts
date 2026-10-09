import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import {
  completeDailyQuestManually,
  completeStarRaceQuestManually,
} from "@/app/compendium/admin/manual-completion-repository";
import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { completeHistoricalChallenge } from "@/app/compendium/admin/historical-completion-service";
import type { HistoricalChallengeKind } from "@/app/compendium/admin/challenge-history-types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ playerId: string }> },
) {
  try {
    const administrator = await requireAdmin();
    const { playerId } = await context.params;
    if (!/^\d{1,20}$/.test(playerId)) {
      return Response.json({ error: "Некорректный участник" }, { status: 400 });
    }
    const body = (await request.json().catch(() => null)) as {
      kind?: unknown;
      questId?: unknown;
      dateKey?: unknown;
      matchIds?: unknown;
      heroId?: unknown;
      partnerPlayerId?: unknown;
    } | null;
    if (body && typeof body.dateKey === "string" && Array.isArray(body.matchIds)
      && ["daily", "rune", "clan_outing", "star_race"].includes(String(body.kind))) {
      if (body.matchIds.some((id) => typeof id !== "string")) {
        return Response.json({ error: "Некорректные номера матчей" }, { status: 400 });
      }
      return Response.json({ ok: true, ...(await completeHistoricalChallenge({
        playerId, dateKey: body.dateKey, kind: body.kind as HistoricalChallengeKind,
        questId: typeof body.questId === "string" ? body.questId : undefined,
        matchIds: body.matchIds as string[], heroId: Number(body.heroId),
        partnerPlayerId: typeof body.partnerPlayerId === "string" ? body.partnerPlayerId : undefined,
        administratorId: administrator.actorDiscordId,
      })) });
    }
    if (body?.kind === "daily" && /^\d{1,19}$/.test(String(body.questId))) {
      return Response.json({
        ok: true,
        ...(await completeDailyQuestManually({
          playerId,
          questId: String(body.questId),
          administratorId: administrator.actorDiscordId,
        })),
      });
    }
    if (
      body?.kind === "star_race" &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(body.dateKey))
    ) {
      return Response.json({
        ok: true,
        ...(await completeStarRaceQuestManually({
          playerId,
          dateKey: String(body.dateKey),
          administratorId: administrator.actorDiscordId,
        })),
      });
    }
    return Response.json({ error: "Некорректное испытание" }, { status: 400 });
  } catch (error) {
    try {
      return responseFromAuthError(error);
    } catch (authError) {
      return responseFromCompendiumError(authError);
    }
  }
}
