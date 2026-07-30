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
    }>(
      `SELECT ingame_name, positions, avatar_url
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
