type OrderedMatch = {
  id: number; scheduled_at: string | Date | null; group_id?: number | null;
  bracket_side?: string | null; bracket_round?: number | null; bracket_slot?: number | null;
  winner_to_match_id?: number | null; loser_to_match_id?: number | null;
};
const isPlayoff = (match: OrderedMatch) => match.group_id == null && ["upper", "lower", "grand_final"].includes(match.bracket_side ?? "");
const time = (match: OrderedMatch) => match.scheduled_at ? new Date(match.scheduled_at).getTime() : Infinity;

/** Stage first, known times before TBA; bracket dependencies determine undated playoff order. */
export function sortTournamentMatches<T extends OrderedMatch>(matches: T[]): T[] {
  const depth = new Map<number, number>();
  // Bounded relaxation handles legacy cycles without hanging the match list.
  for (let pass = 0; pass < matches.length; pass++) {
    let hasChanged = false;
    for (const match of matches.filter(isPlayoff)) {
      for (const target of [match.winner_to_match_id, match.loser_to_match_id]) {
        if (target && (depth.get(target) ?? 0) < (depth.get(match.id) ?? 0) + 1) {
          depth.set(target, (depth.get(match.id) ?? 0) + 1); hasChanged = true;
        }
      }
    }
    if (!hasChanged) break;
  }
  return [...matches].sort((a, b) => {
    const stage = Number(isPlayoff(a)) - Number(isPlayoff(b));
    if (stage) return stage;
    const aTime = time(a), bTime = time(b);
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;
    if (aTime === Infinity && isPlayoff(a)) {
      const final = Number(a.bracket_side === "grand_final") - Number(b.bracket_side === "grand_final");
      return final || (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0) ||
        (a.bracket_round ?? 1) - (b.bracket_round ?? 1) ||
        Number(a.bracket_side === "lower") - Number(b.bracket_side === "lower") ||
        (a.bracket_slot ?? 1) - (b.bracket_slot ?? 1) || a.id - b.id;
    }
    return a.id - b.id;
  });
}
