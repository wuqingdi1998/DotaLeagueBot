export type CompendiumErrorCode =
  | "MISSING_DOTA_ID"
  | "QUEST_NOT_FOUND"
  | "STALE_QUEST"
  | "NO_MATCH"
  | "OPEN_DOTA_UNAVAILABLE"
  | "RATE_LIMITED"
  | "REROLL_USED"
  | "QUEST_COMPLETED";

export class CompendiumError extends Error {
  constructor(
    public readonly code: CompendiumErrorCode,
    message: string,
  ) {
    super(message);
  }
}
