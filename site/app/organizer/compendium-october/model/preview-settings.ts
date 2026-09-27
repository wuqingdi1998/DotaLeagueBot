export const OCTOBER_PREVIEW_STARS_PARAM = "previewStars";
export const OCTOBER_PREVIEW_MAXIMUM_STARS = 100;

export function octoberPreviewStars(value: string | string[] | undefined): number {
  return value === String(OCTOBER_PREVIEW_MAXIMUM_STARS)
    ? OCTOBER_PREVIEW_MAXIMUM_STARS
    : 0;
}
