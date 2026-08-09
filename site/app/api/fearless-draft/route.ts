import { requireSession, responseFromAuthError } from "@/lib/auth";
import type { FearlessDraftCommand } from "@/app/fearless-draft/model/snapshot";
import {
  joinDraftQueue,
  leaveDraftQueue,
  respondToDraftInvitation,
  sendDraftInvitation,
} from "@/app/fearless-draft/server/queue-service";
import {
  abandonDraftSeries,
  dismissCompletedSeries,
  makeDraftChoice,
  selectDraftHero,
  startNextDraftMap,
} from "@/app/fearless-draft/server/series-service";
import {
  loadFearlessDraftSnapshot,
} from "@/app/fearless-draft/server/snapshot-service";
import {
  DraftRequestError,
  draftErrorResponse,
} from "@/app/fearless-draft/server/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireSession();
    return Response.json(await loadFearlessDraftSnapshot(user));
  } catch (error) {
    return draftErrorResponse(error) ?? responseFromAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const command = (await request.json()) as Partial<FearlessDraftCommand>;
    switch (command.action) {
      case "JOIN_QUEUE":
        await joinDraftQueue(user.discordId);
        break;
      case "LEAVE_QUEUE":
        await leaveDraftQueue(user.discordId);
        break;
      case "INVITE":
        if (
          !("opponentId" in command) || typeof command.opponentId !== "string" ||
          !("format" in command) || !command.format
        ) {
          throw new DraftRequestError("Не указан соперник или формат");
        }
        await sendDraftInvitation(user.discordId, command.opponentId, command.format);
        break;
      case "ACCEPT_INVITATION":
      case "DECLINE_INVITATION":
      case "CANCEL_INVITATION": {
        if (!("invitationId" in command)) {
          throw new DraftRequestError("Не указано приглашение");
        }
        const response = command.action === "ACCEPT_INVITATION"
          ? "ACCEPTED"
          : command.action === "DECLINE_INVITATION"
            ? "DECLINED"
            : "CANCELLED";
        await respondToDraftInvitation(
          user.discordId,
          Number(command.invitationId),
          response,
        );
        break;
      }
      case "MAKE_CHOICE":
        if (!("choice" in command)) throw new DraftRequestError("Выбор не указан");
        await makeDraftChoice(user.discordId, command.choice);
        break;
      case "SELECT_HERO":
        if (!("heroId" in command) || !("expectedVersion" in command)) {
          throw new DraftRequestError("Герой не указан");
        }
        await selectDraftHero(
          user.discordId,
          Number(command.heroId),
          Number(command.expectedVersion),
        );
        break;
      case "START_NEXT_MAP":
        await startNextDraftMap(user.discordId);
        break;
      case "ABANDON_SERIES":
        await abandonDraftSeries(user.discordId);
        break;
      case "DISMISS_COMPLETE":
        await dismissCompletedSeries(user.discordId);
        break;
      default:
        throw new DraftRequestError("Неизвестное действие");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return draftErrorResponse(error) ?? responseFromAuthError(error);
  }
}
