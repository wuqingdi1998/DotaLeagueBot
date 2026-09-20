import type { RankedWinSnapshot } from "@/lib/season-ranked-wins/model";

export const STRATZ_CHECK_ATTEMPTS = 5;
export const STRATZ_CHECK_INTERVAL_MS = 3_000;

export type RankedWinCheckProgress = {
  attempt: number;
  total: number;
  message: string;
};

function mergeRankedWinSnapshots(
  current: RankedWinSnapshot | null,
  next: RankedWinSnapshot,
): RankedWinSnapshot {
  if (!current) return next;
  return {
    ...next,
    primaryWins: Math.max(current.primaryWins, next.primaryWins),
    secondaryWins: Math.max(current.secondaryWins, next.secondaryWins),
  };
}

export async function checkStratzWithRetries({
  check,
  onProgress,
  wait = (milliseconds: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  }),
}: {
  check: () => Promise<RankedWinSnapshot>;
  onProgress?: (progress: RankedWinCheckProgress) => void;
  wait?: (milliseconds: number) => Promise<void>;
}): Promise<RankedWinSnapshot> {
  let bestSnapshot: RankedWinSnapshot | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= STRATZ_CHECK_ATTEMPTS; attempt += 1) {
    onProgress?.({
      attempt,
      total: STRATZ_CHECK_ATTEMPTS,
      message: `Проверка STRATZ: попытка ${attempt} из ${STRATZ_CHECK_ATTEMPTS}…`,
    });
    let attemptMessage = "";
    try {
      const snapshot = await check();
      bestSnapshot = mergeRankedWinSnapshots(bestSnapshot, snapshot);
      attemptMessage = `Попытка ${attempt}: основная – ${snapshot.primaryWins}, дополнительная – ${snapshot.secondaryWins}.`;
    } catch (error) {
      lastError = error;
      attemptMessage = `Попытка ${attempt} не удалась.`;
    }

    if (attempt < STRATZ_CHECK_ATTEMPTS) {
      onProgress?.({
        attempt,
        total: STRATZ_CHECK_ATTEMPTS,
        message: `${attemptMessage} Следующая через 3 секунды…`,
      });
      await wait(STRATZ_CHECK_INTERVAL_MS);
    }
  }

  if (bestSnapshot) return bestSnapshot;
  throw lastError instanceof Error
    ? lastError
    : new Error("STRATZ не вернул данные после пяти попыток");
}
