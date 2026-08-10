import { requireSession, responseFromAuthError } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession();
    const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (search.length < 2) {
      return Response.json({ players: [] });
    }
    const players = await query<{
      ingame_name: string;
      positions: string | null;
      avatar_url: string | null;
      tier: number | null;
      tier_status: string;
    }>(
      `SELECT ingame_name, positions, avatar_url, tier_status,
       COALESCE(
         NULLIF(internal_rating, 0),
         CASE
           WHEN rank_tier >= 10 THEN rank_tier / 10
           WHEN rank_tier > 0 THEN rank_tier
           ELSE NULL
         END
       )::int AS tier
       FROM players
       WHERE is_archived = FALSE
         AND ingame_name ILIKE '%' || $1 || '%'
       ORDER BY ingame_name
       LIMIT 100`,
      [search],
    );
    return Response.json({ players });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
