import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { parseRankedWinWarningTarget } from "@/lib/season-ranked-wins/organizer-model";
import { queueOrganizerRankedWinWarning } from "@/lib/season-ranked-wins/warning-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const target = parseRankedWinWarningTarget(
      await request.json().catch(() => null),
    );
    if (!target) {
      return Response.json(
        { error: "Проверьте игрока и выбранный тур" },
        { status: 400 },
      );
    }
    return Response.json(
      await queueOrganizerRankedWinWarning(target, admin.discordId),
    );
  } catch (error) {
    return responseFromAuthError(error);
  }
}
