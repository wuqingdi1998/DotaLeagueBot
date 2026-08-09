import type {
  DraftAssignments,
  DraftChoice,
  DraftPriority,
  DraftSide,
  PartialDraftAssignments,
} from "./types";

const sides: DraftSide[] = ["RADIANT", "DIRE"];
const priorities: DraftPriority[] = ["FIRST", "SECOND"];

function oppositeSide(side: DraftSide): DraftSide {
  return side === "RADIANT" ? "DIRE" : "RADIANT";
}

function oppositePriority(priority: DraftPriority): DraftPriority {
  return priority === "FIRST" ? "SECOND" : "FIRST";
}

export function isDraftChoice(value: unknown): value is DraftChoice {
  return (
    typeof value === "string" &&
    [...sides, ...priorities].includes(value as DraftChoice)
  );
}

/** Fixes the chosen characteristic and returns what the opponent must choose. */
export function applyFirstChoice(
  firstChooserId: string,
  secondChooserId: string,
  choice: DraftChoice,
): PartialDraftAssignments {
  if (sides.includes(choice as DraftSide)) {
    const side = choice as DraftSide;
    return {
      firstChooserId,
      secondChooserId,
      firstChoice: choice,
      assignments: {
        [firstChooserId]: { side, priority: "FIRST" },
        [secondChooserId]: { side: oppositeSide(side), priority: "SECOND" },
      },
      requiredSecondChoices: priorities,
    };
  }
  const priority = choice as DraftPriority;
  return {
    firstChooserId,
    secondChooserId,
    firstChoice: choice,
    assignments: {
      [firstChooserId]: { side: "RADIANT", priority },
      [secondChooserId]: {
        side: "DIRE",
        priority: oppositePriority(priority),
      },
    },
    requiredSecondChoices: sides,
  };
}

export function completeDraftAssignments(
  partial: PartialDraftAssignments,
  secondChoice: DraftChoice,
): DraftAssignments {
  if (!partial.requiredSecondChoices.includes(secondChoice)) {
    throw new Error("Выбрана характеристика не из текущего шага");
  }
  const first = partial.assignments[partial.firstChooserId];
  const second = partial.assignments[partial.secondChooserId];
  if (!first || !second) throw new Error("Не удалось определить участников");

  if (sides.includes(secondChoice as DraftSide)) {
    const secondSide = secondChoice as DraftSide;
    return {
      [partial.secondChooserId]: { ...second, side: secondSide },
      [partial.firstChooserId]: { ...first, side: oppositeSide(secondSide) },
    };
  }
  const secondPriority = secondChoice as DraftPriority;
  return {
    [partial.secondChooserId]: { ...second, priority: secondPriority },
    [partial.firstChooserId]: {
      ...first,
      priority: oppositePriority(secondPriority),
    },
  };
}
