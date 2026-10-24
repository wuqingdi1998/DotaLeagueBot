import { DRAFT_SEQUENCE } from "./config";
import type { DraftActionSnapshot, DraftMapSnapshot, DraftSeriesSnapshot, FearlessDraftSnapshot } from "./snapshot";

/** The saved action and authoritative next turn, without rebuilding a viewer's screen. */
export type DraftHeroActionResult = {
  seriesId: number;
  seriesStatus: DraftSeriesSnapshot["status"];
  seriesUpdatedAt: string;
  serverNow: string;
  map: Pick<DraftMapSnapshot, "id" | "status" | "currentStep" | "version" |
    "stepStartedAt" | "finalPickReviewEndsAt" | "player1ReserveSeconds" | "player2ReserveSeconds">;
  action: DraftActionSnapshot;
};

export function applyDraftHeroActionResult(
  snapshot: FearlessDraftSnapshot,
  result: DraftHeroActionResult,
): FearlessDraftSnapshot {
  const series = snapshot.series;
  if (!series || series.id !== result.seriesId || series.map.id !== result.map.id ||
      series.map.version >= result.map.version ||
      series.map.currentStep !== result.action.step) return snapshot;
  const step = DRAFT_SEQUENCE[result.map.currentStep];
  const firstPlayerId = series.map.firstPickPlayerId;
  const actorId = !step || !firstPlayerId ? null : step.actor === "FIRST"
    ? firstPlayerId : firstPlayerId === series.player1.id ? series.player2.id : series.player1.id;
  return {
    ...snapshot,
    serverNow: result.serverNow,
    series: {
      ...series,
      status: result.seriesStatus,
      updatedAt: result.seriesUpdatedAt,
      map: {
        ...series.map,
        ...result.map,
        currentActorId: actorId,
        currentAction: step?.type ?? null,
        currentPhase: step?.phase ?? null,
        baseDurationSeconds: step?.baseDurationSeconds ?? null,
        previewHeroId: null,
        actions: [...series.map.actions.filter((action) => action.step !== result.action.step), result.action],
        heroSuggestions: series.map.heroSuggestions.filter((suggestion) => suggestion.heroId !== result.action.heroId),
      },
    },
  };
}
