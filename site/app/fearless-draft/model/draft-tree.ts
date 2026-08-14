import { DRAFT_SEQUENCE } from "./config";
import type { DraftActionSnapshot } from "./snapshot";

export type DraftTreeStep = {
  number: number;
  type: DraftActionSnapshot["type"];
  action: DraftActionSnapshot | undefined;
  isRadiant: boolean;
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
      action,
      isRadiant: action
        ? action.actorId === radiantPlayerId
        : isExpectedRadiant,
    };
  });
}

/** Pairs each side's actions by position while preserving every original step number. */
export function buildDraftTreeRows(
  actions: DraftActionSnapshot[],
  radiantPlayerId: string,
  firstPickPlayerId: string,
) {
  const steps = buildDraftTreeSteps(actions, radiantPlayerId, firstPickPlayerId);
  const radiantSteps = steps.filter((step) => step.isRadiant);
  const direSteps = steps.filter((step) => !step.isRadiant);

  return radiantSteps.map((radiant, index) => ({
    radiant,
    dire: direSteps[index],
  }));
}
