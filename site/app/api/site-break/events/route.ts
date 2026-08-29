import { subscribeToSiteBreakEvents } from "@/lib/site-break-events";
import { loadSiteBreakStatus } from "@/lib/site-break-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const keepAliveIntervalMs = 25_000;

export async function GET(request: Request) {
  try {
    const initialStatus = await loadSiteBreakStatus();
    const encoder = new TextEncoder();
    let closeStream = () => undefined;

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        const sendStatus = (isBreakEnabled: boolean) => {
          if (isClosed) return;
          controller.enqueue(encoder.encode(
            `event: status\ndata: ${JSON.stringify({
              isBreakEnabled,
              hasOrganizerAccess: initialStatus.hasOrganizerAccess,
            })}\n\n`,
          ));
        };
        const unsubscribe = subscribeToSiteBreakEvents((event) => {
          sendStatus(event.isBreakEnabled);
        });
        const keepAliveTimer = setInterval(() => {
          if (!isClosed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }, keepAliveIntervalMs);

        closeStream = () => {
          if (isClosed) return;
          isClosed = true;
          unsubscribe();
          clearInterval(keepAliveTimer);
          try {
            controller.close();
          } catch {
            // The browser may close the stream before its abort signal arrives.
          }
        };

        sendStatus(initialStatus.isBreakEnabled);
        request.signal.addEventListener("abort", closeStream, { once: true });
      },
      cancel() {
        closeStream();
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
  } catch {
    return Response.json(
      { error: "Не удалось проверить состояние сайта" },
      { status: 503 },
    );
  }
}
