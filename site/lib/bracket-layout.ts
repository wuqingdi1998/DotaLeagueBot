export const bracketGridSize = 24;
export const bracketColumnStep = 18;
export const bracketRowStep = 8;

export type BracketLayoutMatch = {
  id: number;
  bracket_round: number | null;
  bracket_slot: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
  bracket_grid_column: number | null;
  bracket_grid_row: number | null;
};

export type BracketGridPosition = {
  column: number;
  row: number;
};

export function automaticBracketLayout(
  matches: BracketLayoutMatch[],
): Record<number, BracketGridPosition> {
  const rounds = new Map<number, BracketLayoutMatch[]>();
  for (const match of matches) {
    if (!match.bracket_side || match.bracket_side === "group") continue;
    const round = match.bracket_round ?? 1;
    const roundMatches = rounds.get(round) ?? [];
    roundMatches.push(match);
    rounds.set(round, roundMatches);
  }

  const orderedRounds = Array.from(rounds.entries())
    .sort(([left], [right]) => left - right)
    .map(([round, roundMatches]) => [
      round,
      [...roundMatches].sort(
        (left, right) =>
          (left.bracket_slot ?? 0) - (right.bracket_slot ?? 0) ||
          left.id - right.id,
      ),
    ] as const);
  const maximumMatches = Math.max(
    1,
    ...orderedRounds.map(([, roundMatches]) => roundMatches.length),
  );
  const lastAutomaticRow = (maximumMatches - 1) * bracketRowStep + 1;
  const result: Record<number, BracketGridPosition> = {};

  orderedRounds.forEach(([, roundMatches], roundIndex) => {
    roundMatches.forEach((match, matchIndex) => {
      const automaticRow =
        roundMatches.length === 1
          ? Math.round((1 + lastAutomaticRow) / 2)
          : Math.round(
              1 +
                (matchIndex * (lastAutomaticRow - 1)) /
                  (roundMatches.length - 1),
            );
      result[match.id] = {
        column: roundIndex * bracketColumnStep + 1,
        row: automaticRow,
      };
    });
  });

  return result;
}

export function resolvedBracketLayout(
  matches: BracketLayoutMatch[],
): Record<number, BracketGridPosition> {
  const automatic = automaticBracketLayout(matches);
  return Object.fromEntries(
    matches
      .filter(
        (match) =>
          match.bracket_side !== null && match.bracket_side !== "group",
      )
      .map((match) => [
        match.id,
        match.bracket_grid_column !== null && match.bracket_grid_row !== null
          ? {
              column: match.bracket_grid_column,
              row: match.bracket_grid_row,
            }
          : automatic[match.id],
      ]),
  );
}
