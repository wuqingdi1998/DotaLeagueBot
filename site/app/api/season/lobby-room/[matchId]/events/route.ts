import { requireSession, responseFromAuthError } from "@/lib/auth";
import { loadSeasonLobbyRoomSnapshot } from
  "@/app/season-lobby/[matchId]/server/room-query";
import {
  seasonLobbyRoomErrorResponse,
  SeasonLobbyRoomError,
} from "@/app/season-lobby/[matchId]/server/errors";
import {
  seasonLobbyChannel,
  subscribeToLiveUpdates,
} from "@/lib/live-update-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateIntervalMs = 1_500;
const draftingUpdateIntervalMs = 5_000;

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
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isLoading = false;
    let isClosed = false;
    let reloadQueued = false;
    let nextUpdateIntervalMs = updateIntervalMs;
    let unsubscribe: () => void = () => {};
    const stream = new ReadableStream({
      async start(controller) {
        const pushSnapshot = async () => {
          if (isLoading) {
            reloadQueued = true;
            return;
          }
          isLoading = true;
          try {
            const snapshot = await loadSeasonLobbyRoomSnapshot(user, matchId);
            nextUpdateIntervalMs = snapshot.status === "drafting"
              ? draftingUpdateIntervalMs
              : updateIntervalMs;
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
            if (reloadQueued && !isClosed) {
              reloadQueued = false;
              void pushSnapshot();
            }
          }
        };
        const scheduleUpdate = () => {
          timer = setTimeout(async () => {
            await pushSnapshot();
            if (!isClosed) scheduleUpdate();
          }, nextUpdateIntervalMs);
        };
        unsubscribe = subscribeToLiveUpdates(
          seasonLobbyChannel(matchId),
          () => void pushSnapshot(),
        );
        await pushSnapshot();
        scheduleUpdate();
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          unsubscribe();
          if (timer) clearTimeout(timer);
          try {
            controller.close();
          } catch {
            // The browser can close the stream before the abort signal arrives.
          }
        });
      },
      cancel() {
        isClosed = true;
        unsubscribe();
        if (timer) clearTimeout(timer);
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
