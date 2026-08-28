const steamId64Offset = BigInt("76561197960265728");
const maximumDotaAccountId = BigInt("4294967295");

export function normalizeDotaAccountId(value: string): string | null {
  if (!/^\d{1,10}$/.test(value)) return null;
  const parsed = BigInt(value);
  if (parsed < BigInt(1) || parsed > maximumDotaAccountId) return null;
  return parsed.toString();
}

export function buildPlayerLinks(dotaId: string) {
  const normalized = normalizeDotaAccountId(dotaId);
  if (!normalized) throw new Error("Некорректный Dota ID");
  const steamId64 = steamId64Offset + BigInt(normalized);
  return {
    dotabuff: `https://www.dotabuff.com/players/${normalized}`,
    stratz: `https://stratz.com/players/${normalized}`,
    steam: `https://steamcommunity.com/profiles/${steamId64}`,
  };
}
