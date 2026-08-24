export type CompendiumErrorCode =
  | "COMPENDIUM_FINISHED"
  | "MISSING_DOTA_ID"
  | "QUEST_NOT_FOUND"
  | "STALE_QUEST"
  | "NO_MATCH"
  | "OPEN_DOTA_UNAVAILABLE"
  | "RATE_LIMITED"
  | "REROLL_USED"
  | "QUEST_COMPLETED"
  | "RUNE_ACCESS_REQUIRED"
  | "RUNE_HERO_INVALID"
  | "RUNE_HERO_REQUIRED"
  | "RUNE_HERO_LOCKED"
  | "PREDICTION_INVALID"
  | "PREDICTION_NOT_FOUND"
  | "PREDICTION_NOT_OPEN"
  | "PREDICTION_LOCKED"
  | "STAR_RACE_NOT_ACTIVE";

export class CompendiumError extends Error {
  constructor(
    public readonly code: CompendiumErrorCode,
    message: string,
  ) {
    super(message);
  }
}
