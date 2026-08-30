import { seasonSeriesScore } from "./game-result";

export type PublishedSeasonGame = {
  dotaMatchId: string | null;
  winnerSide: "a" | "b";
};

function publishedGames(value: unknown): PublishedSeasonGame[] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("Укажите данные двух карт");
  }
  return value.map((item) => {
    const game = item as Record<string, unknown>;
    const dotaMatchId = String(game.dotaMatchId ?? "").trim() || null;
    if (dotaMatchId && !/^\d{1,32}$/.test(dotaMatchId)) {
      throw new Error("ID матча должен содержать только цифры");
    }
    if (!["a", "b"].includes(String(game.winnerSide))) {
      throw new Error("Укажите победителя каждой карты");
    }
    return { dotaMatchId, winnerSide: game.winnerSide as "a" | "b" };
  });
}

function score(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0 || result > 2) {
    throw new Error(`${label} должен быть целым числом от 0 до 2`);
  }
  return result;
}

export function publishedLobbyResultValues(body: Record<string, unknown>) {
  const games = publishedGames(body.games);
  const teamAScore = score(body.teamAScore, "Счёт команды A");
  const teamBScore = score(body.teamBScore, "Счёт команды B");
  const calculated = seasonSeriesScore(games.map((game) => game.winnerSide));
  if (
    calculated.teamAScore !== teamAScore ||
    calculated.teamBScore !== teamBScore
  ) {
    throw new Error("Счёт не совпадает с победителями двух карт");
  }
  return { calculated, games, teamAScore, teamBScore };
}
