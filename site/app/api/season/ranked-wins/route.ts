import { requireSession, responseFromAuthError } from "@/lib/auth";
import {
  freshPlayerRankedWins,
  refreshPlayerRankedWins,
} from "@/lib/season-ranked-wins/repository";
import { SeasonRankedWinsError } from "@/lib/season-ranked-wins/service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireSession();
    const cached = await freshPlayerRankedWins(user.discordId);
    const rankedWins = cached ?? (await refreshPlayerRankedWins(user.discordId));
    return Response.json({ ok: true, rankedWins });
  } catch (error) {
    if (error instanceof SeasonRankedWinsError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return responseFromAuthError(error);
  }
}
