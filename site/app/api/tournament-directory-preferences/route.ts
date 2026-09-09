import {
  requireSession,
  responseFromAuthError,
} from "@/lib/auth";
import { saveTournamentDirectoryPreferences } from "@/app/tournaments/services/tournament-directory-preferences";

export async function PATCH(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json().catch(() => null) as {
      shouldHideArchivedTournaments?: unknown;
    } | null;

    if (typeof body?.shouldHideArchivedTournaments !== "boolean") {
      return Response.json(
        { error: "Некорректное значение настройки" },
        { status: 400 },
      );
    }

    await saveTournamentDirectoryPreferences(
      user.discordId,
      body.shouldHideArchivedTournaments,
    );

    return Response.json({
      preferences: {
        shouldHideArchivedTournaments: body.shouldHideArchivedTournaments,
      },
    });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
