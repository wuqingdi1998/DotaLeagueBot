import { deleteSession, getSession } from "@/lib/auth";
import { leaveDraftQueue } from "@/app/fearless-draft/server/queue-service";

export async function POST() {
  const user = await getSession();
  if (user && !user.isStandaloneOrganizer) {
    await leaveDraftQueue(user.discordId);
  }
  await deleteSession();
  return Response.json({ ok: true });
}
