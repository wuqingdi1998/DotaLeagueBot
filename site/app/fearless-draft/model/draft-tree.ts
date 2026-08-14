import { DRAFT_SEQUENCE } from "./config";
import type { DraftActionSnapshot } from "./snapshot";

export function buildDraftTreeSteps(
  actions: DraftActionSnapshot[],
  radiantPlayerId: string,
  firstPickPlayerId: string,
) {
  const actionsByStep = new Map(actions.map((action) => [action.step, action]));
  const isFirstPickRadiant = firstPickPlayerId === radiantPlayerId;

  return DRAFT_SEQUENCE.map((sequenceStep, index) => {
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
