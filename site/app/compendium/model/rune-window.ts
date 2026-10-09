export function runeChallengeWindowStart(dayStart: Date, selectedAt: Date): Date {
  return new Date(Math.max(dayStart.getTime(), selectedAt.getTime()));
}
