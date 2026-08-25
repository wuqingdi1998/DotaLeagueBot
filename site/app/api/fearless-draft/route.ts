import { requireSession, responseFromAuthError } from "@/lib/auth";
import type { FearlessDraftCommand } from "@/app/fearless-draft/model/snapshot";
import {
  joinDraftQueue,
  leaveDraftQueue,
  respondToDraftInvitation,
  sendDraftInvitation,
} from "@/app/fearless-draft/server/queue-service";
import {
  dismissCompletedSeries,
  highlightDraftHero,
  makeDraftChoice,
  selectDraftHero,
} from "@/app/fearless-draft/server/series-service";
import {
  cancelDraftSeriesEnd,
  markReadyForNextDraftMap,
  requestDraftSeriesEnd,
  respondToDraftSeriesEnd,
} from "@/app/fearless-draft/server/agreement-service";
import {
  loadFearlessDraftSnapshot,
} from "@/app/fearless-draft/server/snapshot-service";
import {
  DraftRequestError,
  draftErrorResponse,
} from "@/app/fearless-draft/server/errors";
import {
  advanceBotDraft,
  startBotDraft,
} from "@/app/fearless-draft/server/bot-service";
import { fearlessSeasonMatchId } from
  "@/app/fearless-draft/server/season-match-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    return Response.json(await loadFearlessDraftSnapshot(user, {
      seasonMatchId: fearlessSeasonMatchId(request),
    }));
  } catch (error) {
    return draftErrorResponse(error) ?? responseFromAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const command = (await request.json()) as Partial<FearlessDraftCommand>;
    switch (command.action) {
      case "START_BOT":
        if (!user.isAdmin) {
          throw new DraftRequestError("Режим с ботом доступен только организатору", 403);
        }
        await startBotDraft(user.discordId);
        break;
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
        await advanceBotDraft(user.discordId);
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
        await advanceBotDraft(user.discordId);
        break;
      case "HIGHLIGHT_HERO":
        if (!("heroId" in command) || !("expectedVersion" in command)) {
          throw new DraftRequestError("Герой не указан");
        }
        await highlightDraftHero(
          user.discordId,
          Number(command.heroId),
          Number(command.expectedVersion),
        );
        break;
      case "READY_FOR_NEXT_MAP":
        await markReadyForNextDraftMap(user.discordId);
        await advanceBotDraft(user.discordId);
        break;
      case "REQUEST_SERIES_END":
        await requestDraftSeriesEnd(user.discordId);
        await advanceBotDraft(user.discordId);
        break;
      case "RESPOND_SERIES_END":
        if (
          !("response" in command) ||
          (command.response !== "ACCEPT" && command.response !== "DECLINE")
        ) {
          throw new DraftRequestError("Ответ на запрос не указан");
        }
        await respondToDraftSeriesEnd(user.discordId, command.response);
        break;
      case "CANCEL_SERIES_END":
        await cancelDraftSeriesEnd(user.discordId);
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
