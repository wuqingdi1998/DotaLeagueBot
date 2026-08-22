import { predictionWinner, type PredictionScore } from "./predictions";

export type PredictionPickState =
  | "missing"
  | "pending"
  | "exact"
  | "outcome"
  | "incorrect";

export type PredictionHistoryMatch = {
  id: string;
  position: number;
  teamAName: string;
  teamBName: string;
  scoreOptions: readonly PredictionScore[];
  actualScore: PredictionScore | null;
};

export type PredictionHistoryPick = {
  matchId: string;
  predictedScore: PredictionScore;
  rewardStars: number | null;
};

export type PredictionHistoryPlayer = {
  id: string;
  dotaId: string;
  playerName: string;
  picks: PredictionHistoryPick[];
  earnedStars: number | null;
};

export type PredictionHistoryDay = {
  dateKey: string;
  matches: PredictionHistoryMatch[];
  players: PredictionHistoryPlayer[];
};

export type PredictionHistoryMatchSource = PredictionHistoryMatch & {
  dateKey: string;
};

export type PredictionHistoryPickSource = PredictionHistoryPick & {
  dateKey: string;
  playerId: string;
  dotaId: string;
  playerName: string;
};

export function predictionPickState(
  predictedScore: PredictionScore | null,
  actualScore: PredictionScore | null,
): PredictionPickState {
  if (!predictedScore) return "missing";
  if (!actualScore) return "pending";
  if (predictedScore === actualScore) return "exact";
  return predictionWinner(predictedScore) === predictionWinner(actualScore)
    ? "outcome"
    : "incorrect";
}

export function buildPredictionHistory(
  matches: PredictionHistoryMatchSource[],
  picks: PredictionHistoryPickSource[],
): PredictionHistoryDay[] {
  const playersByDate = new Map<string, Map<string, PredictionHistoryPlayer>>();
  for (const pick of picks) {
    const players = playersByDate.get(pick.dateKey) ?? new Map();
    const player = players.get(pick.playerId) ?? {
      id: pick.playerId,
      dotaId: pick.dotaId,
      playerName: pick.playerName,
      picks: [],
      earnedStars: null,
    };
    player.picks.push({
      matchId: pick.matchId,
      predictedScore: pick.predictedScore,
      rewardStars: pick.rewardStars,
    });
    if (pick.rewardStars !== null) {
      player.earnedStars = (player.earnedStars ?? 0) + pick.rewardStars;
    }
    players.set(pick.playerId, player);
    playersByDate.set(pick.dateKey, players);
  }
  const days = new Map<string, PredictionHistoryDay>();
  for (const match of matches) {
    const day = days.get(match.dateKey) ?? {
      dateKey: match.dateKey,
      matches: [],
      players: [...(playersByDate.get(match.dateKey)?.values() ?? [])],
    };
    day.matches.push({
      id: match.id,
      position: match.position,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      scoreOptions: match.scoreOptions,
      actualScore: match.actualScore,
    });
    days.set(match.dateKey, day);
  }
  for (const day of days.values()) {
    const hasAnyResult = day.matches.some((match) => match.actualScore !== null);
    if (hasAnyResult) {
      for (const player of day.players) {
        player.earnedStars ??= 0;
      }
    }
  }
  return [...days.values()];
}
