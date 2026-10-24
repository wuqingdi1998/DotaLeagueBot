import { after } from "next/server";
import { DRAFT_HERO_ACTION_BUDGET_MS } from "@/app/fearless-draft/model/performance";
import { requireSession } from "@/lib/auth";
import { requirePlayerParticipation } from "@/lib/player-participation";
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
  draftRouteErrorResponse,
} from "@/app/fearless-draft/server/errors";
import {
  advanceBotDraft,
  startBotDraft,
} from "@/app/fearless-draft/server/bot-service";
import { fearlessSeasonMatchId } from
  "@/app/fearless-draft/server/season-match-context";
import { processBot3Captains } from "@/app/fearless-draft/server/bot3-captain-service";
import { removeDraftHeroSuggestions, toggleDraftHeroSuggestion } from
  "@/app/fearless-draft/server/suggestion-service";
import { submitDraftLineupAssignment } from
  "@/app/fearless-draft/server/lineup-assignment-service";
import {
  fearlessDraftChannel,
  publishLiveUpdate,
  seasonLobbyChannel,
} from "@/lib/live-update-events";

import { validateDraftActionTarget } from "@/app/fearless-draft/server/draft-context";
import type { DraftHeroActionResult } from "@/app/fearless-draft/model/hero-action-result";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    return Response.json(await loadFearlessDraftSnapshot(user, {
      seasonMatchId: fearlessSeasonMatchId(request),
    }));
  } catch (error) {
    return draftRouteErrorResponse(error, "Не удалось обновить драфт");
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const user = await requireSession();
    const seasonMatchId = fearlessSeasonMatchId(request);
    const command = (await request.json()) as Partial<FearlessDraftCommand> & { seriesId?: number; mapId?: number };
    const target = () => validateDraftActionTarget({
      seriesId: command.seriesId, mapId: command.mapId, seasonMatchId,
    });
    let heroAction: DraftHeroActionResult | undefined;
    if (!seasonMatchId && ["MAKE_CHOICE", "SELECT_HERO", "HIGHLIGHT_HERO", "SUBMIT_LINEUP_ASSIGNMENT", "READY_FOR_NEXT_MAP"].includes(command.action ?? "") &&
      await processBot3Captains(user.discordId, undefined, target())) throw new DraftRequestError("Сначала завершите выбор капитанов", 409);
    if ([
      "START_BOT",
      "START_BOT2",
      "START_BOT3",
      "JOIN_QUEUE",
      "INVITE",
      "ACCEPT_INVITATION",
    ].includes(command.action ?? "")) {
      await requirePlayerParticipation(user.discordId);
    }
    switch (command.action) {
      case "BOT3_CAPTAIN_INTEREST":
        if (typeof command.wantsCaptain !== "boolean") throw new DraftRequestError("Ответ не указан");
        await processBot3Captains(user.discordId, { action: command.action, value: command.wantsCaptain }, target());
        break;
      case "BOT3_CAPTAIN_VOTE":
      case "BOT3_CAPTAIN_TIEBREAK":
        if (typeof command.candidatePlayerId !== "string") throw new DraftRequestError("Кандидат не указан");
        await processBot3Captains(user.discordId, { action: command.action, value: command.candidatePlayerId }, target());
        break;
      case "START_BOT":
        await startBotDraft(user.discordId);
        break;
      case "START_BOT2":
        await startBotDraft(user.discordId, "BO3", "lobby-preview");
        break;
      case "START_BOT3":
        await startBotDraft(user.discordId, "BO3", "season-lobby-preview");
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
        await makeDraftChoice(user.discordId, command.choice, target());
        break;
      case "SELECT_HERO":
        if (!("heroId" in command) || !("expectedVersion" in command)) {
          throw new DraftRequestError("Герой не указан");
        }
        heroAction = await selectDraftHero(
          user.discordId,
          Number(command.heroId),
          Number(command.expectedVersion),
          target(),
        );
        break;
      case "HIGHLIGHT_HERO":
        if (!("heroId" in command) || !("expectedVersion" in command)) {
          throw new DraftRequestError("Герой не указан");
        }
        await highlightDraftHero(
          user.discordId,
          Number(command.heroId),
          Number(command.expectedVersion),
          target(),
        );
        break;
      case "TOGGLE_HERO_SUGGESTION":
        if (!("heroId" in command) || !("expectedVersion" in command)) {
          throw new DraftRequestError("Герой не указан");
        }
        await toggleDraftHeroSuggestion(
          user.discordId,
          Number(command.heroId),
          Number(command.expectedVersion),
          target(),
        );
        break;
      case "REMOVE_HERO_SUGGESTIONS":
        if (!("heroIds" in command) || !Array.isArray(command.heroIds) ||
          !("expectedVersion" in command)) {
          throw new DraftRequestError("Герои не указаны");
        }
        await removeDraftHeroSuggestions(
          user.discordId,
          command.heroIds.map(Number),
          Number(command.expectedVersion),
          target(),
        );
        break;
      case "SUBMIT_LINEUP_ASSIGNMENT":
        if (!("assignments" in command) || !Array.isArray(command.assignments)) {
          throw new DraftRequestError("Распределение героев не указано");
        }
        await submitDraftLineupAssignment(user.discordId, command.assignments, target());
        break;
      case "READY_FOR_NEXT_MAP":
        await markReadyForNextDraftMap(user.discordId, target());
        break;
      case "REQUEST_SERIES_END":
        await requestDraftSeriesEnd(user.discordId, target());
        break;
      case "RESPOND_SERIES_END":
        if (
          !("response" in command) ||
          (command.response !== "ACCEPT" && command.response !== "DECLINE")
        ) {
          throw new DraftRequestError("Ответ на запрос не указан");
        }
        await respondToDraftSeriesEnd(user.discordId, command.response, target());
        break;
      case "CANCEL_SERIES_END":
        await cancelDraftSeriesEnd(user.discordId, target());
        break;
      case "DISMISS_COMPLETE":
        await dismissCompletedSeries(user.discordId, target());
        break;
      default:
        throw new DraftRequestError("Неизвестное действие");
    }
    const shouldAdvanceBot = [
      "START_BOT", "START_BOT2", "START_BOT3", "MAKE_CHOICE", "SELECT_HERO",
      "SUBMIT_LINEUP_ASSIGNMENT", "READY_FOR_NEXT_MAP", "REQUEST_SERIES_END",
    ].includes(command.action ?? "");
    after(async () => {
      publishLiveUpdate(fearlessDraftChannel(seasonMatchId));
      if (seasonMatchId && command.action === "SUBMIT_LINEUP_ASSIGNMENT") {
        publishLiveUpdate(seasonLobbyChannel(seasonMatchId));
      }
      if (shouldAdvanceBot && !seasonMatchId) {
        try {
          await advanceBotDraft(user.discordId, command.seriesId);
          publishLiveUpdate(fearlessDraftChannel(seasonMatchId));
        } catch (error) {
          console.error("Bot follow-up failed after saved draft action", error);
        }
      }
    });
    if (heroAction) {
      const durationMs = Date.now() - startedAt;
      if (durationMs > DRAFT_HERO_ACTION_BUDGET_MS) console.warn("Slow Fearless Draft hero selection", {
        seasonMatchId, durationMs, seriesId: heroAction.seriesId,
      });
      return Response.json({ ok: true, heroAction }, {
        headers: { "Server-Timing": `draft;dur=${durationMs}` },
      });
    }
    if (command.action?.startsWith("BOT3_CAPTAIN_")) {
      return Response.json({ ok: true, snapshot: await loadFearlessDraftSnapshot(user, { seasonMatchId }) });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return draftRouteErrorResponse(error, "Действие не выполнено");
  }
}
