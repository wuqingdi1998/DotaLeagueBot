import { requireSession, responseFromAuthError } from "@/lib/auth";
import { CompendiumError } from "@/app/compendium/model/errors";
import { checkDailyQuest } from "@/app/compendium/services/compendium";

export const dynamic = "force-dynamic";

const errorStatuses = {
  MISSING_DOTA_ID: 409,
  QUEST_NOT_FOUND: 404,
  STALE_QUEST: 409,
  NO_MATCH: 404,
  OPEN_DOTA_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
} as const;

export async function POST(
  _request: Request,
  context: { params: Promise<{ questId: string }> },
) {
  try {
    const user = await requireSession();
    const { questId } = await context.params;
    if (!/^\d{1,19}$/.test(questId)) {
      return Response.json({ error: "Некорректное задание" }, { status: 400 });
    }
    return Response.json({
      ok: true,
      ...(await checkDailyQuest(user, questId)),
    });
  } catch (error) {
    if (error instanceof CompendiumError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: errorStatuses[error.code] },
      );
    }
    return responseFromAuthError(error);
  }
}
