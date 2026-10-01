import { responseFromAuthError, requireSession } from "@/lib/auth";
import { OCTOBER_CLANS, type OctoberClanId } from "@/lib/october-clans";
import { OctoberClanReservationError } from "@/app/organizer/compendium-october/model/clan-reservation";
import { reserveOctoberClan } from "@/app/organizer/compendium-october/services/clan-reservations";

export const dynamic = "force-dynamic";

function isOctoberClanId(value: unknown): value is OctoberClanId {
  return OCTOBER_CLANS.some((clan) => clan.id === value);
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json().catch(() => null) as { clanId?: unknown } | null;
    if (!isOctoberClanId(body?.clanId)) {
      return Response.json({ error: "Выберите существующий клан" }, { status: 400 });
    }
    const reservation = await reserveOctoberClan(user.discordId, body.clanId);
    return Response.json({ ok: true, reservation });
  } catch (error) {
    if (error instanceof OctoberClanReservationError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.code === "RUNE_REQUIRED" ? 403 : 409 },
      );
    }
    return responseFromAuthError(error);
  }
}
