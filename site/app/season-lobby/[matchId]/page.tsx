import { notFound, redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { loadFearlessDraftSnapshot } from
  "@/app/fearless-draft/server/snapshot-service";
import { SeasonLobbyRoomError } from "./server/errors";
import { loadSeasonLobbyRoomSnapshot } from "./server/room-query";
import { SeasonLobbyRoomScreen } from "./SeasonLobbyRoomScreen";

export const dynamic = "force-dynamic";

async function loadRoomPage(
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  matchId: number,
) {
  try {
    const room = await loadSeasonLobbyRoomSnapshot(user, matchId);
    const draft = ["drafting", "break"].includes(room.status) && room.currentUserTeamSide
      ? await loadFearlessDraftSnapshot(user, { seasonMatchId: matchId })
      : null;
    return { room, draft };
  } catch (error) {
    if (error instanceof SeasonLobbyRoomError) notFound();
    throw error;
  }
}

export default async function SeasonLobbyRoomPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId: rawMatchId } = await params;
  const matchId = Number(rawMatchId);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();
  const user = await getSession();
  if (!user) {
    redirect(
      `/api/auth/discord?returnTo=${encodeURIComponent(`/season-lobby/${matchId}`)}`,
    );
  }
  const { room, draft } = await loadRoomPage(user, matchId);
  return (
    <PlatformShell user={user}>
      <SeasonLobbyRoomScreen initialRoom={room} initialDraft={draft} />
    </PlatformShell>
  );
}
