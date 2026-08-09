import { DRAFT_SEQUENCE } from "./config";
import type {
  DraftAction,
  DraftActionType,
  DraftActor,
  DraftMapState,
} from "./types";

export type DraftActionResult =
  | { ok: true; state: DraftMapState }
  | { ok: false; reason: string };

export function currentDraftStep(state: DraftMapState) {
  return DRAFT_SEQUENCE[state.currentStep] ?? null;
}

export function isDraftComplete(state: DraftMapState): boolean {
  return state.currentStep >= DRAFT_SEQUENCE.length;
}

export function usedHeroIds(state: DraftMapState): Set<number> {
  return new Set(
    state.actions.flatMap((action) =>
      action.heroId === null ? [] : [action.heroId],
    ),
  );
}

export function isHeroAvailable(
  state: DraftMapState,
  heroId: number,
): boolean {
  return (
    !state.unavailableHeroIds.includes(heroId) &&
    !usedHeroIds(state).has(heroId)
  );
}

/** Applies one server-approved step without depending on React or the database. */
export function applyDraftAction(
  state: DraftMapState,
  input: {
    actor: DraftActor;
    type: DraftActionType;
    heroId: number | null;
  },
): DraftActionResult {
  const expected = currentDraftStep(state);
  if (!expected) return { ok: false, reason: "Драфт уже завершён" };
  if (input.actor !== expected.actor) {
    return { ok: false, reason: "Сейчас ход другого участника" };
  }
  if (input.type !== expected.type) {
    return { ok: false, reason: "Действие не соответствует текущему этапу" };
  }
  if (input.heroId === null && input.type !== "BAN") {
    return { ok: false, reason: "Для выбора нужен герой" };
  }
  if (input.heroId !== null && !isHeroAvailable(state, input.heroId)) {
    return { ok: false, reason: "Этот герой уже недоступен" };
  }

  const action: DraftAction = {
    step: state.currentStep,
    actor: input.actor,
    type: input.type,
    heroId: input.heroId,
  };
  return {
    ok: true,
    state: {
      ...state,
      currentStep: state.currentStep + 1,
      actions: [...state.actions, action],
    },
  };
}

export function countDraftActions(
  actions: DraftAction[],
  actor: DraftActor,
  type: DraftActionType,
): number {
  return actions.filter(
    (action) => action.actor === actor && action.type === type,
  ).length;
}

export function previousMapPickedHeroIds(
  maps: readonly { actions: DraftAction[] }[],
): number[] {
  return [
    ...new Set(
      maps.flatMap((map) =>
        map.actions.flatMap((action) =>
          action.type === "PICK" && action.heroId !== null
            ? [action.heroId]
            : [],
        ),
      ),
    ),
  ];
}
