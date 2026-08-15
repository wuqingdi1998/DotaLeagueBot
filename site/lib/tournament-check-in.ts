const statusVisibilityMinutes = 10;

export type TournamentCheckInWindow = {
  opensAt: string;
  closesAt: string;
  statusVisibleUntil: string;
  isOpen: boolean;
  isUpcoming: boolean;
  shouldShowStatus: boolean;
};

export function tournamentCheckInWindow({
  firstMatchAt,
  checkInMinutes,
  now = new Date(),
}: {
  firstMatchAt: string | null;
  checkInMinutes: number;
  now?: Date;
}): TournamentCheckInWindow | null {
  if (!firstMatchAt) return null;

  const firstMatchTime = new Date(firstMatchAt).getTime();
  if (!Number.isFinite(firstMatchTime)) return null;

  const nowTime = now.getTime();
  const opensAt = firstMatchTime - Math.max(0, checkInMinutes) * 60_000;
  const statusVisibleUntil =
    firstMatchTime + statusVisibilityMinutes * 60_000;

  return {
    opensAt: new Date(opensAt).toISOString(),
    closesAt: new Date(firstMatchTime).toISOString(),
    statusVisibleUntil: new Date(statusVisibleUntil).toISOString(),
    isOpen: nowTime >= opensAt && nowTime < firstMatchTime,
    isUpcoming: nowTime < opensAt,
    shouldShowStatus: nowTime < statusVisibleUntil,
  };
}
