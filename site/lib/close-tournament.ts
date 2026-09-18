export const closeGameFormats = [
  "Fearless Draft",
  "Captain's Mode",
  "Captain's Draft",
  "Single Draft",
  "Другой режим",
] as const;

export type CloseGameFormat = (typeof closeGameFormats)[number];

export function isCloseGameFormat(value: unknown): value is CloseGameFormat {
  return closeGameFormats.includes(value as CloseGameFormat);
}

export function usesFearlessDraft(format: string): boolean {
  return format === "Fearless Draft";
}

export function isDirectCloseGameFormat(format: string): boolean {
  return [
    "Captain's Mode",
    "Captain's Draft",
    "Single Draft",
    "Другой режим",
    "CM",
    "CD",
    "SD",
  ].includes(format);
}

export function validCloseBestOf(format: CloseGameFormat, bestOf: number) {
  return [1, 2, 3].includes(bestOf) &&
    (!usesFearlessDraft(format) || [2, 3].includes(bestOf));
}
