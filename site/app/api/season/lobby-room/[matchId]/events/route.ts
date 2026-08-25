import { requireSession, responseFromAuthError } from "@/lib/auth";
import { loadSeasonLobbyRoomSnapshot } from
  "@/app/season-lobby/[matchId]/server/room-query";
import {
  seasonLobbyRoomErrorResponse,
  SeasonLobbyRoomError,
} from "@/app/season-lobby/[matchId]/server/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateIntervalMs = 1_500;

function matchIdFromRoute(value: string): number {
  const matchId = Number(value);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new SeasonLobbyRoomError("Некорректное лобби");
  }
  return matchId;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireSession();
    const { matchId: rawMatchId } = await context.params;
    const matchId = matchIdFromRoute(rawMatchId);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | null = null;
    let isLoading = false;
    let isClosed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const pushSnapshot = async () => {
          if (isLoading) return;
          isLoading = true;
          try {
            const snapshot = await loadSeasonLobbyRoomSnapshot(user, matchId);
            if (!isClosed) controller.enqueue(encoder.encode(
              `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`,
            ));
          } catch (error) {
            if (!isClosed) controller.enqueue(encoder.encode(
              `event: server-error\ndata: ${JSON.stringify({
                message: error instanceof Error ? error.message : "Ошибка обновления",
              })}\n\n`,
            ));
          } finally {
            isLoading = false;
          }
        };
        await pushSnapshot();
        timer = setInterval(() => void pushSnapshot(), updateIntervalMs);
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          if (timer) clearInterval(timer);
          try {
            controller.close();
          } catch {
            // The browser can close the stream before the abort signal arrives.
          }
        });
      },
      cancel() {
        isClosed = true;
        if (timer) clearInterval(timer);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return seasonLobbyRoomErrorResponse(error) ?? responseFromAuthError(error);
  }
}
