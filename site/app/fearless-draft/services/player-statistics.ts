export type DraftPlayerStatistics = {
  tournaments: number;
  tournamentWins: number;
  podiums: number;
  maps: number;
  mapWins: number;
  winRate: number;
};

type PlayerStatisticsResponse = {
  profile?: {
    statistics?: DraftPlayerStatistics;
  };
};

export async function loadDraftPlayerStatistics(
  dotaId: string,
  signal?: AbortSignal,
): Promise<DraftPlayerStatistics> {
  const response = await fetch(`/api/players/${encodeURIComponent(dotaId)}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error("Не удалось загрузить статистику игрока");
  }

  const payload = await response.json() as PlayerStatisticsResponse;
  if (!payload.profile?.statistics) {
    throw new Error("Не удалось загрузить статистику игрока");
  }
  return payload.profile.statistics;
}
