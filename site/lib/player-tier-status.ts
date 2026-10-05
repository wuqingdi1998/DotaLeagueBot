export type PlayerTierStatus = "current" | "outdated" | "inactive";

export type TierStatusApplicationPlayer = {
  ingame_name: string;
  tier_status: PlayerTierStatus;
};

export type NormalizedTierInput = {
  isOutdated: boolean;
  numericTier: number;
};

export const inactivePlayerParticipationMessage =
  "Снимите статус «Инактив» у @frokeng";

export function inactivePlayerParticipationError(
  tierStatus: string | null | undefined,
): string | null {
  return tierStatus === "inactive" ? inactivePlayerParticipationMessage : null;
}

export function normalizeParticipantTierInput(
  tier: number | string,
): NormalizedTierInput | null {
  const value = String(tier).trim();
  if (value === "!") return { isOutdated: true, numericTier: 0 };
  if (!/^(?:[0-9]|1[0-2])$/.test(value)) return null;
  return { isOutdated: false, numericTier: Number(value) };
}

export function tierStatusApplicationError(
  players: TierStatusApplicationPlayer[],
): string | null {
  if (players.some((player) => player.tier_status === "inactive")) {
    return inactivePlayerParticipationMessage;
  }
  const nicknames = players
    .filter((player) => player.tier_status === "outdated")
    .map((player) => player.ingame_name);
  if (!nicknames.length) return null;
  return `У игрока (-ов) ${nicknames.join(", ")} неактуальный тир, для актуализации пишите @frokeng`;
}
