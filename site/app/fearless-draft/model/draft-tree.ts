import { DRAFT_SEQUENCE } from "./config";
import type { DraftActionSnapshot } from "./snapshot";
import type { DraftPhase } from "./types";

export type DraftTreeStep = {
  number: number;
  type: DraftActionSnapshot["type"];
  phase: DraftPhase;
  action: DraftActionSnapshot | undefined;
  isRadiant: boolean;
};

export type DraftTreeRow = {
  radiant?: DraftTreeStep;
  dire?: DraftTreeStep;
};

export function buildDraftTreeSteps(
  actions: DraftActionSnapshot[],
  radiantPlayerId: string,
  firstPickPlayerId: string,
) {
  const actionsByStep = new Map(actions.map((action) => [action.step, action]));
  const isFirstPickRadiant = firstPickPlayerId === radiantPlayerId;

  return DRAFT_SEQUENCE.map((sequenceStep, index): DraftTreeStep => {
    const action = actionsByStep.get(index);
    const isExpectedRadiant = sequenceStep.actor === "FIRST"
      ? isFirstPickRadiant
      : !isFirstPickRadiant;
    return {
      number: index + 1,
      type: sequenceStep.type,
      phase: sequenceStep.phase,
      action,
      isRadiant: action
        ? action.actorId === radiantPlayerId
        : isExpectedRadiant,
    };
  });
}

/** Keeps steps chronological and only pairs opposing actions from the same phase. */
export function buildDraftTreeRows(
  actions: DraftActionSnapshot[],
  radiantPlayerId: string,
  firstPickPlayerId: string,
) {
  const steps = buildDraftTreeSteps(actions, radiantPlayerId, firstPickPlayerId);
  const rows: DraftTreeRow[] = [];

  for (let index = 0; index < steps.length;) {
    const currentStep = steps[index];
    const nextStep = steps[index + 1];
    const canPair = currentStep.isRadiant !== nextStep?.isRadiant &&
      currentStep.phase === nextStep?.phase;

    if (nextStep && canPair) {
      rows.push({
        radiant: currentStep.isRadiant ? currentStep : nextStep,
        dire: currentStep.isRadiant ? nextStep : currentStep,
      });
      index += 2;
    } else {
      rows.push(currentStep.isRadiant ? { radiant: currentStep } : { dire: currentStep });
      index += 1;
    }
  }

  return rows;
}
