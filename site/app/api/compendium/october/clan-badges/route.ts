import { loadOctoberClanBadgeDirectory } from "@/lib/october-clan-badge-directory";

export const dynamic = "force-dynamic";

export async function GET() {
  const clansByDotaId = await loadOctoberClanBadgeDirectory();
  return Response.json(clansByDotaId, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
