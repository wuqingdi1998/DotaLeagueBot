import { getSession } from "@/lib/auth";
import { loadPlayerActionNotifications } from "./player-action-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  const notifications = user
    ? await loadPlayerActionNotifications(user.discordId)
    : [];
  return Response.json(
    { notifications },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
