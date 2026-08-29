export const DRAFT_SUGGESTION_RUN_DURATION_MS = 12_000;
export const DRAFT_SUGGESTION_BREATHE_DURATION_MS = 4_800;
export const DRAFT_SUGGESTION_DASH_PATH_LENGTH = 140;
export const DRAFT_SUGGESTION_DASH_COUNT = 20;

const DRAFT_SUGGESTION_DASH_LENGTH = 4;
const DRAFT_SUGGESTION_PLAYER_LIMIT = 5;
const DRAFT_SUGGESTION_DASH_PERIOD = (
  DRAFT_SUGGESTION_DASH_PATH_LENGTH / DRAFT_SUGGESTION_DASH_COUNT
);

export type DraftSuggestionDashLayer = {
  color: string;
  dashArray: string;
  dashCount: number;
  dashStart: number;
};

export type DraftSuggestionAnimationFrame = {
  dashTravel: number;
  opacity: number;
  glowRadius: number;
};

function cycleProgress(nowMs: number, durationMs: number): number {
  const elapsed = ((nowMs % durationMs) + durationMs) % durationMs;
  return elapsed / durationMs;
}

export function draftSuggestionDashLayers(
  colors: string[],
): DraftSuggestionDashLayer[] {
  const activeColors = colors.slice(0, DRAFT_SUGGESTION_PLAYER_LIMIT);
  return activeColors.map((color, index) => ({
    color,
    dashArray: `${DRAFT_SUGGESTION_DASH_LENGTH} ${(
      DRAFT_SUGGESTION_DASH_PERIOD * activeColors.length
      - DRAFT_SUGGESTION_DASH_LENGTH
    )}`,
    dashCount: Math.ceil(
      (DRAFT_SUGGESTION_DASH_COUNT - index) / activeColors.length,
    ),
    dashStart: -DRAFT_SUGGESTION_DASH_PERIOD * index,
  }));
}

export function stableServerClockOffset(
  previousOffsetMs: number | null,
  observedOffsetMs: number,
): number {
  return previousOffsetMs === null
    ? observedOffsetMs
    : Math.max(previousOffsetMs, observedOffsetMs);
}

export function draftSuggestionAnimationFrame(
  synchronizedNowMs: number,
): DraftSuggestionAnimationFrame {
  const runProgress = cycleProgress(
    synchronizedNowMs,
    DRAFT_SUGGESTION_RUN_DURATION_MS,
  );
  const breatheProgress = cycleProgress(
    synchronizedNowMs,
    DRAFT_SUGGESTION_BREATHE_DURATION_MS,
  );
  const breatheStrength = (1 - Math.cos(breatheProgress * Math.PI * 2)) / 2;
  return {
    dashTravel: DRAFT_SUGGESTION_DASH_PATH_LENGTH * runProgress,
    opacity: 0.4 + 0.6 * breatheStrength,
    glowRadius: 1 + 3 * breatheStrength,
  };
}
