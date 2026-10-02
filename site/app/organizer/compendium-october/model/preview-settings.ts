export const OCTOBER_PREVIEW_STARS_PARAM = "previewStars";
export const OCTOBER_PREVIEW_STARTED_PARAM = "previewStarted";
export const OCTOBER_PREVIEW_MAXIMUM_STARS = 120;

export function octoberPreviewStars(value: string | string[] | undefined): number {
  return value === String(OCTOBER_PREVIEW_MAXIMUM_STARS)
    ? OCTOBER_PREVIEW_MAXIMUM_STARS
    : 0;
}

export function octoberPreviewStarted(
  value: string | string[] | undefined,
  scheduledStarted: boolean,
): boolean {
  if (value === "1") return true;
  if (value === "0") return false;
  return scheduledStarted;
}
