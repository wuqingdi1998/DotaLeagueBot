import { seasonSeriesScore } from "./game-result";

export type PublishedSeasonGame = {
  dotaMatchId: string | null;
  winnerSide: "a" | "b";
};

function publishedGames(value: unknown): PublishedSeasonGame[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new Error("Укажите данные всех карт матча (от одной до трёх)");
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

function score(value: unknown, label: string, maximum: number) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0 || result > maximum) {
    throw new Error(`${label} должен быть целым числом от 0 до ${maximum}`);
  }
  return result;
}

export function publishedLobbyResultValues(body: Record<string, unknown>) {
  const games = publishedGames(body.games);
  const teamAScore = score(body.teamAScore, "Счёт команды A", games.length);
  const teamBScore = score(body.teamBScore, "Счёт команды B", games.length);
  const calculated = seasonSeriesScore(games.map((game) => game.winnerSide));
  if (
    calculated.teamAScore !== teamAScore ||
    calculated.teamBScore !== teamBScore
  ) {
    throw new Error("Счёт не совпадает с победителями карт");
  }
  return { calculated, games, teamAScore, teamBScore };
}
