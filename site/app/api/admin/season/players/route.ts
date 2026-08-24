import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (search.length < 2) return Response.json({ players: [] });

    const players = await query<{
      discord_id: string;
      dota_id: string;
      nickname: string;
      tier: number | null;
    }>(
      `SELECT discord_id::text, steam_id32::text AS dota_id,
         ingame_name AS nickname,
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
         AND (
           ingame_name ILIKE '%' || $1 || '%'
           OR discord_id::text = $1
           OR steam_id32::text = $1
         )
       ORDER BY LOWER(ingame_name), discord_id
       LIMIT 30`,
      [search],
    );
    return Response.json({ players });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
