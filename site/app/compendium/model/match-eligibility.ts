import {
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_NORMAL_ALL_PICK_START_AT,
} from "@/lib/october-compendium-schedule";
import { RANKED_GAME_MODES, RANKED_LOBBY_TYPES } from "./constants";
import type { OpenDotaMatch } from "./types";

const NORMAL_LOBBY_TYPE = 0;
const ALL_PICK_GAME_MODE = 22;
const NORMAL_ALL_PICK_START = Date.parse(OCTOBER_NORMAL_ALL_PICK_START_AT);
const NORMAL_ALL_PICK_END = Date.parse(OCTOBER_COMPENDIUM_END_AT);

export function matchEndedAt(match: OpenDotaMatch): Date {
  return new Date((match.start_time + match.duration) * 1_000);
}

export function isCompendiumEligibleMatch(match: OpenDotaMatch): boolean {
  if (RANKED_LOBBY_TYPES.has(match.lobby_type) && RANKED_GAME_MODES.has(match.game_mode)) {
    return true;
  }
  const endedAt = matchEndedAt(match).getTime();
  return match.lobby_type === NORMAL_LOBBY_TYPE &&
    match.game_mode === ALL_PICK_GAME_MODE &&
    endedAt >= NORMAL_ALL_PICK_START && endedAt < NORMAL_ALL_PICK_END;
}
