export function parseGroupCount(value: unknown): number | null {
  const groupCount = Number(value ?? 2);
  if (
    !Number.isInteger(groupCount) ||
    groupCount < 1 ||
    groupCount > 8
  ) {
    return null;
  }
  return groupCount;
}
