import { createHash, timingSafeEqual } from "node:crypto";

export function secretMatches(candidate: string, expected: string) {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function playerServerName(
  realName: string | null,
  playerName: string,
  positions: string | null,
) {
  const identity = realName?.trim()
    ? `${realName.trim()} (${playerName})`
    : playerName;
  return positions?.trim() ? `${identity} ${positions.trim()}` : identity;
}
