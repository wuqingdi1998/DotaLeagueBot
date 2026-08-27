import { requireSession, responseFromAuthError } from "@/lib/auth";
import type { SeasonLobbyRoomCommand } from
  "@/app/season-lobby/[matchId]/model/types";
import {
  setSeasonLobbyCaptain,
  transferSeasonLobbyCaptain,
} from "@/app/season-lobby/[matchId]/server/captain-transfer";
import {
  sendSeasonLobbyMessage,
  startSeasonLobbyVoting,
  startSeasonLobbyWithCaptains,
  voteForSeasonLobbyCaptain,
} from "@/app/season-lobby/[matchId]/server/room-commands";
import {
  seasonLobbyRoomErrorResponse,
  SeasonLobbyRoomError,
} from "@/app/season-lobby/[matchId]/server/errors";
import { loadSeasonLobbyRoomSnapshot } from
  "@/app/season-lobby/[matchId]/server/room-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function roomMatchId(value: string): number {
  const matchId = Number(value);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new SeasonLobbyRoomError("Некорректное лобби");
  }
  return matchId;
}

function roomErrorResponse(error: unknown): Response {
  const roomError = seasonLobbyRoomErrorResponse(error);
  if (roomError) return roomError;
  try {
    return responseFromAuthError(error);
  } catch (unhandledError) {
    console.error("Season lobby room request failed", unhandledError);
    return Response.json(
      { error: "Сервер не смог выполнить действие" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireSession();
    const { matchId } = await context.params;
    return Response.json(
      await loadSeasonLobbyRoomSnapshot(user, roomMatchId(matchId)),
    );
  } catch (error) {
    return roomErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireSession();
    const { matchId: rawMatchId } = await context.params;
    const matchId = roomMatchId(rawMatchId);
    const command = (await request.json()) as Partial<SeasonLobbyRoomCommand>;
    if (command.action === "SEND_MESSAGE") {
      await sendSeasonLobbyMessage(matchId, user, command.message);
    } else if (command.action === "START_VOTING") {
      await startSeasonLobbyVoting(
        matchId,
        user,
        command.force === true,
      );
    } else if (command.action === "START_WITH_CAPTAINS") {
      await startSeasonLobbyWithCaptains(
        matchId,
        user,
        command.teamACaptainId,
        command.teamBCaptainId,
        command.force === true,
      );
    } else if (command.action === "VOTE_CAPTAIN") {
      await voteForSeasonLobbyCaptain(
        matchId,
        user.discordId,
        command.candidatePlayerId,
      );
    } else if (command.action === "TRANSFER_CAPTAIN") {
      await transferSeasonLobbyCaptain(
        matchId,
        user.discordId,
        command.newCaptainPlayerId,
      );
    } else if (command.action === "SET_CAPTAIN") {
      await setSeasonLobbyCaptain(
        matchId,
        user,
        command.teamSide,
        command.newCaptainPlayerId,
      );
    } else {
      throw new SeasonLobbyRoomError("Неизвестное действие");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return roomErrorResponse(error);
  }
}
