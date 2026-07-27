export type BracketOutcomeMatch = {
  team_a: string;
  team_b: string;
  team_a_application_id: number | null;
  team_b_application_id: number | null;
  team_a_score: number | null;
  team_b_score: number | null;
  team_a_result_label: string | null;
  team_b_result_label: string | null;
};

export type BracketEliminationMatch = Pick<
  BracketOutcomeMatch,
  | "team_a"
  | "team_b"
  | "team_a_application_id"
  | "team_b_application_id"
> & {
  eliminated_team_application_id: number | null;
};

export type BracketRoutingMatch = {
  group_id: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
};

export function matchUsesBracketRouting(match: BracketRoutingMatch) {
  return (
    match.group_id === null &&
    (match.bracket_side === "upper" ||
      match.bracket_side === "lower" ||
      match.bracket_side === "grand_final")
  );
}

export function bracketTeamKey(id: number | null, name: string) {
  return id ? `id:${id}` : `name:${name.trim().toLowerCase()}`;
}

export function bracketOutcomeKeys(match: BracketOutcomeMatch) {
  const aKey = bracketTeamKey(
    match.team_a_application_id,
    match.team_a,
  );
  const bKey = bracketTeamKey(
    match.team_b_application_id,
    match.team_b,
  );
  const aLabel = match.team_a_result_label?.trim().toLowerCase();
  const bLabel = match.team_b_result_label?.trim().toLowerCase();
  const winnerLabels = new Set(["tw", "w", "win", "winner"]);
  const loserLabels = new Set(["tl", "l", "loss", "lose", "ff", "forfeit"]);

  if (
    (aLabel !== undefined && winnerLabels.has(aLabel)) ||
    (bLabel !== undefined && loserLabels.has(bLabel))
  ) {
    return { winner: aKey, loser: bKey };
  }
  if (
    (bLabel !== undefined && winnerLabels.has(bLabel)) ||
    (aLabel !== undefined && loserLabels.has(aLabel))
  ) {
    return { winner: bKey, loser: aKey };
  }
  if (
    match.team_a_score !== null &&
    match.team_b_score !== null &&
    match.team_a_score !== match.team_b_score
  ) {
    return match.team_a_score > match.team_b_score
      ? { winner: aKey, loser: bKey }
      : { winner: bKey, loser: aKey };
  }
  return { winner: null, loser: null };
}

export function bracketOutcomeSlot(
  match: BracketOutcomeMatch,
  outcome: "winner" | "loser",
): "a" | "b" | null {
  const teamKey = bracketOutcomeKeys(match)[outcome];
  if (teamKey === bracketTeamKey(match.team_a_application_id, match.team_a)) {
    return "a";
  }
  if (teamKey === bracketTeamKey(match.team_b_application_id, match.team_b)) {
    return "b";
  }
  return null;
}

export function bracketEliminatedTeamKey(
  match: BracketEliminationMatch,
): string | null {
  if (
    match.eliminated_team_application_id !== null &&
    match.eliminated_team_application_id === match.team_a_application_id
  ) {
    return bracketTeamKey(match.team_a_application_id, match.team_a);
  }
  if (
    match.eliminated_team_application_id !== null &&
    match.eliminated_team_application_id === match.team_b_application_id
  ) {
    return bracketTeamKey(match.team_b_application_id, match.team_b);
  }
  return null;
}
