import { notFound, redirect } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { MatchRoomScreen } from "./MatchRoomScreen";
import { MatchRoomError } from "./server/errors";
import { loadMatchRoomSnapshot } from "./server/room-query";

export const dynamic = "force-dynamic";

async function loadRoom(
  actor: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  matchId: number,
) {
  try {
    return await loadMatchRoomSnapshot(actor, matchId);
  } catch (error) {
    if (error instanceof MatchRoomError) notFound();
    throw error;
  }
}

export default async function MatchRoomPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId: rawMatchId } = await params;
  const matchId = Number(rawMatchId);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();
  const actor = await getSession();
  if (!actor) redirect(`/api/auth/discord?returnTo=${encodeURIComponent(`/match-room/${matchId}`)}`);
  const snapshot = await loadRoom(actor, matchId);
  return <PlatformShell user={actor}><MatchRoomScreen initialSnapshot={snapshot} /></PlatformShell>;
}
