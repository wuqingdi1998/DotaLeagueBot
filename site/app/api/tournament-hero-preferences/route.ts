import { requireSession, responseFromAuthError } from "@/lib/auth";
import {
  saveTournamentHeroPreference,
} from "@/app/tournaments/[slug]/services/tournament-hero-preferences";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;
    const tournamentId = Number(body.tournamentId);

    if (
      !Number.isInteger(tournamentId) ||
      tournamentId <= 0 ||
      typeof body.isCollapsed !== "boolean"
    ) {
      return Response.json(
        { error: "Некорректная настройка шапки" },
        { status: 400 },
      );
    }

    await saveTournamentHeroPreference(
      user.discordId,
      tournamentId,
      body.isCollapsed,
    );
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
