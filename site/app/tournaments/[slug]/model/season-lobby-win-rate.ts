export type SeasonLobbyWinRateStanding = {
  playedRounds: number;
  winRate: number | null;
};

export type SeasonLobbyPlayerWinRate = {
  estimated: boolean;
  label: string;
  value: number;
};

const ESTIMATED_WIN_RATE = 0.5;
const MINIMUM_ROUNDS_FOR_REAL_WIN_RATE = 3;
const FULL_TEAM_SIZE = 5;

function formatWinRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function getSeasonLobbyPlayerWinRate(
  standing: SeasonLobbyWinRateStanding | undefined,
): SeasonLobbyPlayerWinRate {
  if (
    !standing ||
    standing.playedRounds < MINIMUM_ROUNDS_FOR_REAL_WIN_RATE ||
    standing.winRate === null ||
    !Number.isFinite(standing.winRate)
  ) {
    return {
      estimated: true,
      label: "~50%",
      value: ESTIMATED_WIN_RATE,
    };
  }
  const value = Math.min(1, Math.max(0, standing.winRate));
  return { estimated: false, label: formatWinRate(value), value };
}

export function getSeasonLobbyTeamWinRate(
  playerIds: readonly string[],
  standings: ReadonlyMap<string, SeasonLobbyWinRateStanding>,
) {
  if (playerIds.length !== FULL_TEAM_SIZE) return null;
  const value = playerIds.reduce(
    (total, playerId) =>
      total + getSeasonLobbyPlayerWinRate(standings.get(playerId)).value,
    0,
  ) / FULL_TEAM_SIZE;
  return { label: formatWinRate(value), value };
}
