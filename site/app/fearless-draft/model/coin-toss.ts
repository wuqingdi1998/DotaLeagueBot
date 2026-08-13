export const COIN_TOSS_SEGMENT_COUNT = 1_000;

export function coinTossWinnerIndex(segment: number): 0 | 1 {
  return segment < COIN_TOSS_SEGMENT_COUNT / 2 ? 1 : 0;
}

export function coinTossAngleDegrees(segment: number): number {
  return ((segment + 0.5) / COIN_TOSS_SEGMENT_COUNT) * 360;
}
