export type PlayerTierStatus = "current" | "outdated" | "inactive";

export type TierStatusApplicationPlayer = {
  ingame_name: string;
  tier_status: PlayerTierStatus;
};

export type NormalizedTierInput = {
  isOutdated: boolean;
  numericTier: number;
};

export function normalizeParticipantTierInput(
  tier: number | string,
): NormalizedTierInput | null {
  const value = String(tier).trim();
  if (value === "!") return { isOutdated: true, numericTier: 0 };
  if (!/^(?:[0-9]|1[0-2])$/.test(value)) return null;
  return { isOutdated: false, numericTier: Number(value) };
}

export function outdatedTierApplicationError(
  players: TierStatusApplicationPlayer[],
): string | null {
  const nicknames = players
    .filter((player) => player.tier_status !== "current")
    .map((player) => player.ingame_name);
  if (!nicknames.length) return null;
  return `У игрока (-ов) ${nicknames.join(", ")} неактуальный тир, для актуализации пишите @frokeng`;
}
