import { createHash, scryptSync, timingSafeEqual } from "node:crypto";

export function secretMatches(candidate: string, expected: string) {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function secretHashMatches(
  candidate: string,
  expectedHash: string,
) {
  if (!/^[a-f\d]{64}$/i.test(expectedHash)) return false;
  const candidateHash = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(candidateHash, Buffer.from(expectedHash, "hex"));
}

export function scryptSecretHashMatches(
  candidate: string,
  encodedHash: string,
) {
  const [algorithm, saltHex, expectedHashHex, extra] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    extra !== undefined ||
    !/^[a-f\d]{32}$/i.test(saltHex) ||
    !/^[a-f\d]{128}$/i.test(expectedHashHex)
  ) {
    return false;
  }
  const candidateHash = scryptSync(
    candidate,
    Buffer.from(saltHex, "hex"),
    64,
  );
  return timingSafeEqual(candidateHash, Buffer.from(expectedHashHex, "hex"));
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
