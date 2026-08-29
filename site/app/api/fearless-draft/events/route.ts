import { requireSession, responseFromAuthError } from "@/lib/auth";
import { loadFearlessDraftSnapshot } from "@/app/fearless-draft/server/snapshot-service";
import { fearlessSeasonMatchId } from
  "@/app/fearless-draft/server/season-match-context";
import {
  fearlessDraftChannel,
  subscribeToLiveUpdates,
} from "@/lib/live-update-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateIntervalMs = 1_250;

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const seasonMatchId = fearlessSeasonMatchId(request);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | null = null;
    let isLoading = false;
    let isClosed = false;
    let reloadQueued = false;
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
            const snapshot = await loadFearlessDraftSnapshot(user, {
              seasonMatchId,
            });
            if (isClosed) return;
            controller.enqueue(
              encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`),
            );
          } catch (error) {
            if (!isClosed) controller.enqueue(
              encoder.encode(
                `event: server-error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Ошибка обновления" })}\n\n`,
              ),
            );
          } finally {
            isLoading = false;
            if (reloadQueued && !isClosed) {
              reloadQueued = false;
              void pushSnapshot();
            }
          }
        };
        unsubscribe = subscribeToLiveUpdates(
          fearlessDraftChannel(seasonMatchId),
          () => void pushSnapshot(),
        );
        await pushSnapshot();
        timer = setInterval(() => void pushSnapshot(), updateIntervalMs);
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          unsubscribe();
          if (timer) clearInterval(timer);
          try {
            controller.close();
          } catch {
            // The browser may close the stream before the abort signal arrives.
          }
        });
      },
      cancel() {
        isClosed = true;
        unsubscribe();
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
    return responseFromAuthError(error);
  }
}
