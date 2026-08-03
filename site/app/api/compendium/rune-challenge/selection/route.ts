import { requireSession } from "@/lib/auth";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { selectRuneChallengeHero } from "@/app/compendium/services/rune-challenge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as { heroId?: unknown };
    if (!Number.isInteger(body.heroId)) {
      return Response.json({ error: "Выберите героя из списка" }, { status: 400 });
    }
    return Response.json({
      ok: true,
      runeChallenge: await selectRuneChallengeHero(user, Number(body.heroId)),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
