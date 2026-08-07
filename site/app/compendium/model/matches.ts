import {
  MATCHMADE_LOBBY_TYPES,
  RANKED_GAME_MODES,
  RANKED_LOBBY_TYPES,
} from "./constants";
import type { MatchingWin, OpenDotaMatch } from "./types";

function isPlayerWin(match: OpenDotaMatch): boolean {
  const isRadiant = match.player_slot < 128;
  return isRadiant === match.radiant_win;
}

function isQualifyingWin(input: {
  match: OpenDotaMatch;
  allowedHeroes: ReadonlySet<number>;
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): boolean {
  return (
    input.allowedHeroes.has(input.match.hero_id) &&
    RANKED_LOBBY_TYPES.has(input.match.lobby_type) &&
    RANKED_GAME_MODES.has(input.match.game_mode) &&
    isPlayerWin(input.match) &&
    endedInsideWindow(input)
  );
}

function matchingWin(match: OpenDotaMatch): MatchingWin {
  return {
    heroId: match.hero_id,
    matchId: String(match.match_id),
    endedAt: matchEndedAt(match),
  };
}

function endedInsideWindow(input: {
  match: OpenDotaMatch;
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): boolean {
  const endedAt = matchEndedAt(input.match).getTime();
  return (
    endedAt >= input.dayStart.getTime() &&
    endedAt < input.dayEnd.getTime() &&
    endedAt <= input.now.getTime()
  );
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
  const match = input.matches.find((candidate) =>
    isQualifyingWin({
      match: candidate,
      allowedHeroes,
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      now: input.now,
    }),
  );
  return match ? matchingWin(match) : null;
}

export function findDistinctMatchingWins(input: {
  matches: OpenDotaMatch[];
  heroIds: readonly number[];
  requiredDistinctWins: number;
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): MatchingWin[] | null {
  const allowedHeroes = new Set(input.heroIds);
  const matchedHeroes = new Set<number>();
  const wins: MatchingWin[] = [];
  for (const candidate of input.matches) {
    if (
      matchedHeroes.has(candidate.hero_id) ||
      !isQualifyingWin({
        match: candidate,
        allowedHeroes,
        dayStart: input.dayStart,
        dayEnd: input.dayEnd,
        now: input.now,
      })
    ) {
      continue;
    }
    matchedHeroes.add(candidate.hero_id);
    wins.push(matchingWin(candidate));
    if (wins.length === input.requiredDistinctWins) return wins;
  }
  return null;
}

export function scanWinningBuildingDamage(input: {
  matches: OpenDotaMatch[];
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): { totalDamage: number; wins: MatchingWin[] } {
  let totalDamage = 0;
  const wins: MatchingWin[] = [];
  for (const match of input.matches) {
    if (
      !MATCHMADE_LOBBY_TYPES.has(match.lobby_type) ||
      !isPlayerWin(match) ||
      !endedInsideWindow({ ...input, match })
    ) {
      continue;
    }
    totalDamage += match.tower_damage ?? 0;
    wins.push(matchingWin(match));
  }
  return { totalDamage, wins };
}
