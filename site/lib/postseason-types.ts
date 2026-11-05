export type PostseasonSide = "upper" | "lower" | "grand_final";
export type PostseasonTarget = { matchKey: string; slot: "a" | "b" };
export type PostseasonMatchPlan = {
  stage: string;
  bracketSide: PostseasonSide;
  bracketRound: number;
  bracketSlot: number;
  teamAPlaceholder: string;
  teamBPlaceholder: string;
  winnerTo?: PostseasonTarget;
  loserTo?: PostseasonTarget;
};

export function postseasonMatchKey(match: Pick<PostseasonMatchPlan, "bracketSide" | "bracketRound" | "bracketSlot">) {
  return `${match.bracketSide}:${match.bracketRound}:${match.bracketSlot}`;
}
