export type DraftFormat = "BO2" | "BO3";
export type DraftActor = "FIRST" | "SECOND";
export type DraftActionType = "BAN" | "PICK";
export type DraftSide = "RADIANT" | "DIRE";
export type DraftPriority = "FIRST" | "SECOND";
export type DraftChoice = DraftSide | DraftPriority;

export type DraftPhase =
  | "FIRST_BANS"
  | "FIRST_PICKS"
  | "SECOND_BANS"
  | "SECOND_PICKS"
  | "FINAL_BANS"
  | "FINAL_PICKS";

export type DraftSequenceStep = {
  actor: DraftActor;
  type: DraftActionType;
  phase: DraftPhase;
  baseDurationSeconds: number;
};

export type DraftAction = {
  step: number;
  actor: DraftActor;
  type: DraftActionType;
  heroId: number | null;
};

export type DraftMapState = {
  currentStep: number;
  actions: DraftAction[];
  unavailableHeroIds: number[];
};

export type PlayerAssignment = {
  side: DraftSide;
  priority: DraftPriority;
};

export type DraftAssignments = Record<string, PlayerAssignment>;

export type PartialDraftAssignments = {
  firstChooserId: string;
  secondChooserId: string;
  firstChoice: DraftChoice;
  assignments: Partial<DraftAssignments>;
  requiredSecondChoices: DraftChoice[];
};
