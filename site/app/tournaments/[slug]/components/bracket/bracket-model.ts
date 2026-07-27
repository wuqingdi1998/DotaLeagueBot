import {
  bracketOutcomeKeys,
  bracketOutcomeSlot,
  bracketTeamKey,
} from "../../../../../lib/bracket";
import type { BracketGridPosition } from "../../../../../lib/bracket-layout";

export type BracketMatch = {
  id: number;
  team_a: string;
  team_b: string;
  team_a_application_id: number | null;
  team_b_application_id: number | null;
  team_a_score: number | null;
  team_b_score: number | null;
  team_a_result_label: string | null;
  team_b_result_label: string | null;
  decision_note: string | null;
  best_of: number;
  status: string;
  bracket_round: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
  bracket_slot: number | null;
  bracket_grid_column: number | null;
  bracket_grid_row: number | null;
  eliminated_team_application_id: number | null;
  winner_to_match_id: number | null;
  winner_to_slot: "a" | "b" | null;
  loser_to_match_id: number | null;
  loser_to_slot: "a" | "b" | null;
};

export type BracketEdge = {
  key: string;
  sourceId: number;
  targetId: number;
  targetSlot: "a" | "b";
  outcome: "winner" | "loser";
  sourceSlot: "a" | "b" | null;
  teamKey: string | null;
};

export type DrawnBracketEdge = BracketEdge & {
  path: string;
};

export type BracketDragState = {
  matchId: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origin: BracketGridPosition;
};

export const bracketCardWidth = 280;
export const bracketBoardHeaderHeight = 62;
export const bracketBoardSafetyHeight = 260;
export const bracketBoardHorizontalPadding = 64;

export function clampBracketCoordinate(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function matchTeamKeys(match: BracketMatch) {
  return [
    bracketTeamKey(match.team_a_application_id, match.team_a),
    bracketTeamKey(match.team_b_application_id, match.team_b),
  ];
}

export function buildBracketEdges(matches: BracketMatch[]) {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const result: BracketEdge[] = [];

  for (const match of matches) {
    for (const outcome of ["winner", "loser"] as const) {
      const targetId =
        outcome === "winner"
          ? match.winner_to_match_id
          : match.loser_to_match_id;
      const targetSlot =
        outcome === "winner" ? match.winner_to_slot : match.loser_to_slot;
      if (!targetId || !targetSlot) continue;

      const sourceKeys = matchTeamKeys(match);
      const target = matchById.get(targetId);
      const routedKey = bracketOutcomeKeys(match)[outcome];
      const targetKey = target
        ? matchTeamKeys(target)[targetSlot === "a" ? 0 : 1]
        : null;
      const teamKey =
        routedKey ?? (targetKey && sourceKeys.includes(targetKey) ? targetKey : null);

      result.push({
        key: `${match.id}-${outcome}-${targetId}`,
        sourceId: match.id,
        targetId,
        targetSlot,
        outcome,
        sourceSlot:
          teamKey === sourceKeys[0]
            ? "a"
            : teamKey === sourceKeys[1]
              ? "b"
              : bracketOutcomeSlot(match, outcome),
        teamKey,
      });
    }
  }

  return result;
}

export function bracketRoundTitle(
  round: number,
  matches: BracketMatch[],
) {
  if (matches.some((match) => match.bracket_side === "grand_final")) {
    return "Гранд-финал";
  }
  return `Раунд ${round}`;
}
