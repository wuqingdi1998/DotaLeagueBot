import { CompendiumError } from "@/app/compendium/model/errors";
import { responseFromAuthError } from "@/lib/auth";

const compendiumErrorStatuses = {
  MISSING_DOTA_ID: 409,
  QUEST_NOT_FOUND: 404,
  STALE_QUEST: 409,
  NO_MATCH: 404,
  OPEN_DOTA_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  REROLL_USED: 409,
  QUEST_COMPLETED: 409,
  RUNE_ACCESS_REQUIRED: 403,
  RUNE_HERO_INVALID: 400,
  RUNE_HERO_REQUIRED: 409,
  RUNE_HERO_LOCKED: 409,
  PREDICTION_INVALID: 400,
  PREDICTION_NOT_FOUND: 404,
  PREDICTION_LOCKED: 409,
  STAR_RACE_NOT_ACTIVE: 409,
} as const;

export function responseFromCompendiumError(error: unknown): Response {
  if (error instanceof CompendiumError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: compendiumErrorStatuses[error.code] },
    );
  }
  return responseFromAuthError(error);
}
