import { requireSession, responseFromAuthError } from "@/lib/auth";
import type { MatchRoomSnapshot } from "@/app/match-room/[matchId]/model/types";
import { matchRoomErrorResponse, MatchRoomError } from "@/app/match-room/[matchId]/server/errors";
import { loadMatchRoomSnapshot } from "@/app/match-room/[matchId]/server/room-query";
import { ordinaryMatchRoomChannel, subscribeToLiveUpdates } from "@/lib/live-update-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function matchIdFromRoute(value: string) {
  const matchId = Number(value);
  if (!Number.isInteger(matchId) || matchId <= 0) throw new MatchRoomError("Некорректный матч");
  return matchId;
}

export async function GET(request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    const actor = await requireSession();
    const { matchId: rawMatchId } = await context.params;
    const matchId = matchIdFromRoute(rawMatchId);
    let initialSnapshot: MatchRoomSnapshot | null = await loadMatchRoomSnapshot(actor, matchId);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let loading = false;
    let closed = false;
    let queued = false;
    let unsubscribe = () => {};
    const stream = new ReadableStream({
      async start(controller) {
        const push = async () => {
          if (loading) { queued = true; return; }
          loading = true;
          try {
            const snapshot = initialSnapshot ?? await loadMatchRoomSnapshot(actor, matchId);
            initialSnapshot = null;
            if (!closed) controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`));
          } catch (error) {
            if (!closed) controller.enqueue(encoder.encode(`event: server-error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Ошибка обновления" })}\n\n`));
          } finally {
            loading = false;
            if (queued && !closed) { queued = false; void push(); }
          }
        };
        const schedule = () => {
          timer = setTimeout(async () => { await push(); if (!closed) schedule(); }, 2_000);
        };
        unsubscribe = subscribeToLiveUpdates(ordinaryMatchRoomChannel(matchId), () => void push());
        await push();
        schedule();
        request.signal.addEventListener("abort", () => {
          closed = true;
          unsubscribe();
          if (timer) clearTimeout(timer);
          try { controller.close(); } catch { /* Browser already closed the stream. */ }
        });
      },
      cancel() {
        closed = true;
        unsubscribe();
        if (timer) clearTimeout(timer);
      },
    });
    return new Response(stream, { headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    } });
  } catch (error) {
    return matchRoomErrorResponse(error) ?? responseFromAuthError(error);
  }
}
