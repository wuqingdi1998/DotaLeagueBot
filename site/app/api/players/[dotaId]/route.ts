import { loadPublicPlayerProfile } from "@/lib/player-profile";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dotaId: string }> },
) {
  const { dotaId } = await context.params;
  const profile = await loadPublicPlayerProfile(dotaId);
  if (!profile) {
    return Response.json({ error: "Игрок не найден" }, { status: 404 });
  }
  return Response.json({ profile });
}
