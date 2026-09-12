import { requireSession, responseFromAuthError } from "@/lib/auth";
import type { MatchRoomCommand } from "@/app/match-room/[matchId]/model/types";
import { matchRoomErrorResponse, MatchRoomError } from "@/app/match-room/[matchId]/server/errors";
import { sendMatchRoomMessage } from "@/app/match-room/[matchId]/server/message-service";
import { loadMatchRoomSnapshot } from "@/app/match-room/[matchId]/server/room-query";
import { reportMatchRoomGame, resolveMatchRoomDispute } from "@/app/match-room/[matchId]/server/result-service";
import { ordinaryMatchRoomChannel, publishLiveUpdate } from "@/lib/live-update-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function matchIdFromRoute(value: string) {
  const matchId = Number(value);
  if (!Number.isInteger(matchId) || matchId <= 0) throw new MatchRoomError("Некорректный матч");
  return matchId;
}

function errorResponse(error: unknown) {
  const roomResponse = matchRoomErrorResponse(error);
  if (roomResponse) return roomResponse;
  try {
    return responseFromAuthError(error);
  } catch (unhandledError) {
    console.error("Ordinary match room request failed", unhandledError);
    return Response.json({ error: "Сервер не смог выполнить действие" }, { status: 500 });
  }
}

export async function GET(_request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    const actor = await requireSession();
    const { matchId } = await context.params;
    return Response.json(await loadMatchRoomSnapshot(actor, matchIdFromRoute(matchId)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    const actor = await requireSession();
    const { matchId: rawMatchId } = await context.params;
    const matchId = matchIdFromRoute(rawMatchId);
    const command = (await request.json()) as Partial<MatchRoomCommand>;
    if (command.action === "SEND_MESSAGE") {
      await sendMatchRoomMessage(matchId, actor, command.message);
    } else if (command.action === "REPORT_GAME_RESULT") {
      await reportMatchRoomGame(matchId, actor, command.dotaMatchId, command.winnerSide);
    } else if (command.action === "RESOLVE_DISPUTE") {
      await resolveMatchRoomDispute(matchId, actor, command.dotaMatchId, command.winnerSide);
    } else {
      throw new MatchRoomError("Неизвестное действие");
    }
    publishLiveUpdate(ordinaryMatchRoomChannel(matchId));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
