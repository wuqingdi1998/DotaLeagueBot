import { RANKED_GAME_MODES, RANKED_LOBBY_TYPES } from "./constants";
import type { MatchingWin, OpenDotaMatch } from "./types";

function isPlayerWin(match: OpenDotaMatch): boolean {
  const isRadiant = match.player_slot < 128;
  return isRadiant === match.radiant_win;
}

export function matchEndedAt(match: OpenDotaMatch): Date {
  return new Date((match.start_time + match.duration) * 1_000);
}

export function findMatchingWin(input: {
  matches: OpenDotaMatch[];
  heroIds: number[];
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): MatchingWin | null {
  const allowedHeroes = new Set(input.heroIds);
  const match = input.matches.find((candidate) => {
    const endedAt = matchEndedAt(candidate).getTime();
    return (
      allowedHeroes.has(candidate.hero_id) &&
      RANKED_LOBBY_TYPES.has(candidate.lobby_type) &&
      RANKED_GAME_MODES.has(candidate.game_mode) &&
      isPlayerWin(candidate) &&
      endedAt >= input.dayStart.getTime() &&
      endedAt < input.dayEnd.getTime() &&
      endedAt <= input.now.getTime()
    );
  });
  return match
    ? {
        heroId: match.hero_id,
        matchId: String(match.match_id),
        endedAt: matchEndedAt(match),
      }
    : null;
}
