import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import {
  isSeasonTournamentLinkId,
  normalizeSeasonTournamentHref,
} from "@/app/season/model/season-overview-model";
import { saveSeasonTournamentLink } from "@/app/season/services/season-tournament-links";

type SeasonTournamentLinkBody = {
  linkId?: unknown;
  href?: unknown;
};

export async function PUT(request: Request) {
  try {
    const organizer = await requireAdmin();
    const body = (await request.json()) as SeasonTournamentLinkBody;
    if (!isSeasonTournamentLinkId(body.linkId)) {
      return Response.json({ error: "Неизвестный турнир" }, { status: 400 });
    }

    const href = normalizeSeasonTournamentHref(body.href);
    if (!href) {
      return Response.json(
        { error: "Введите корректную ссылку на турнир" },
        { status: 400 },
      );
    }

    await saveSeasonTournamentLink({
      linkId: body.linkId,
      href,
      organizerId: organizer.discordId,
    });
    return Response.json({ ok: true, href });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
