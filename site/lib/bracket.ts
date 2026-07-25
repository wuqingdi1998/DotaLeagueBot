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

  if (aLabel === "tw" || bLabel === "tl") {
    return { winner: aKey, loser: bKey };
  }
  if (bLabel === "tw" || aLabel === "tl") {
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
