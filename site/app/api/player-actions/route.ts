import { getSession } from "@/lib/auth";
import { loadActiveSeasonLobbyMatchId } from "@/app/season-lobby/[matchId]/server/room-access";
import { loadPlayerActionNotifications } from "./player-action-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  const [notifications, activeSeasonLobbyMatchId] = user && !user.isStandaloneOrganizer
    ? await Promise.all([
        loadPlayerActionNotifications(user.discordId),
        loadActiveSeasonLobbyMatchId(user.discordId),
      ])
    : [[], null];
  return Response.json(
    { notifications, activeSeasonLobbyMatchId },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
