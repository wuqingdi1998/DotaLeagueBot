import { requireSession, responseFromAuthError } from "@/lib/auth";
import { one } from "@/lib/db";
import {
  freshPlayerRankedWins,
  refreshPlayerRankedWins,
} from "@/lib/season-ranked-wins/repository";
import { SeasonRankedWinsError } from "@/lib/season-ranked-wins/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json().catch(() => null) as { roundId?: unknown } | null;
    const roundId = Number(body?.roundId);
    if (!Number.isSafeInteger(roundId) || roundId <= 0) {
      return Response.json({ error: "Некорректный тур" }, { status: 400 });
    }
    const round = await one<{ id: number }>(
      `SELECT round.id::int FROM season_rounds round
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE round.id = $1 AND round.is_visible = TRUE
         AND tournament.tournament_type = 'seasonal'`,
      [roundId],
    );
    if (!round) {
      return Response.json({ error: "Тур не найден" }, { status: 404 });
    }
    const cached = await freshPlayerRankedWins(roundId, user.discordId);
    const rankedWins = cached ?? (await refreshPlayerRankedWins(roundId, user.discordId));
    return Response.json({ ok: true, rankedWins });
  } catch (error) {
    if (error instanceof SeasonRankedWinsError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return responseFromAuthError(error);
  }
}
