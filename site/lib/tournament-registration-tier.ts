export type RegistrationTierPlayer = {
  ingame_name: string;
  tier: number | null;
};

export function teamTierTotal(players: RegistrationTierPlayer[]) {
  if (players.some((player) => player.tier === null)) return null;
  return players.reduce((total, player) => total + (player.tier ?? 0), 0);
}

export function registrationTierError(
  maximumTeamTier: number | null,
  players: RegistrationTierPlayer[],
) {
  if (maximumTeamTier === null) return null;
  const withoutTier = players
    .filter((player) => player.tier === null)
    .map((player) => player.ingame_name);
  if (withoutTier.length) {
    return `Не указан актуальный тир игрока: ${withoutTier.join(", ")}. Обратитесь к организатору.`;
  }
  const total = teamTierTotal(players) ?? 0;
  return total > maximumTeamTier
    ? `Сумма тиров команды — ${total}. Максимум для этого турнира — ${maximumTeamTier}.`
    : null;
}

export function parseMaximumTeamTier(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const tier = Number(value);
  return Number.isInteger(tier) && tier >= 1 && tier <= 100 ? tier : undefined;
}
