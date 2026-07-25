import { requireSession, responseFromAuthError } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession();
    const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const players = await query<{
      discord_id: string;
      ingame_name: string;
      positions: string | null;
      avatar_url: string | null;
    }>(
      `SELECT discord_id::text, ingame_name, positions, avatar_url
       FROM players
       WHERE $1 = '' OR ingame_name ILIKE '%' || $1 || '%'
       ORDER BY ingame_name
       LIMIT 50`,
      [search],
    );
    return Response.json({ players });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
