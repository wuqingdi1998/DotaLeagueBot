import { loadPublicPlayerBadges } from "@/lib/player-profile-badges";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ dotaId: string }> }) {
  const { dotaId } = await context.params;
  const badgeKeys = await loadPublicPlayerBadges(dotaId);
  return badgeKeys === null ? Response.json({ error: "Игрок не найден" }, { status: 404 })
    : Response.json({ badgeKeys }, { headers: { "Cache-Control": "no-store" } });
}
