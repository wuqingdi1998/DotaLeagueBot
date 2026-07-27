export type PrizeInput = {
  placement?: number;
  applicationId?: number | null;
  teamName?: string | null;
  prizeText?: string | null;
};

export type NormalizedPrize = {
  placement: number;
  applicationId: number | null;
  teamName: string | null;
  prizeText: string | null;
};

export function normalizePrizes(prizes: PrizeInput[]): NormalizedPrize[] {
  return prizes.map((prize) => ({
    placement: Number(prize.placement),
    applicationId:
      prize.applicationId === null ||
      prize.applicationId === undefined ||
      prize.applicationId === 0
        ? null
        : Number(prize.applicationId),
    teamName: prize.teamName?.trim() || null,
    prizeText: prize.prizeText?.trim() || null,
  }));
}

export function prizeValidationError(
  prizes: NormalizedPrize[],
): string | null {
  if (
    prizes.some(
      (prize) =>
        !Number.isInteger(prize.placement) ||
        prize.placement < 1 ||
        prize.placement > 64,
    )
  ) {
    return "Для каждого призового места укажите номер от 1 до 64";
  }
  if (
    prizes.some(
      (prize) =>
        prize.applicationId !== null &&
        (!Number.isInteger(prize.applicationId) || prize.applicationId < 1),
    )
  ) {
    return "Для призового места выбрана некорректная команда";
  }
  if (prizes.some((prize) => (prize.teamName?.length ?? 0) > 100)) {
    return "Название команды в призовом месте не должно превышать 100 символов";
  }
  if (prizes.some((prize) => (prize.prizeText?.length ?? 0) > 160)) {
    return "Описание награды не должно превышать 160 символов";
  }
  if (new Set(prizes.map((prize) => prize.placement)).size !== prizes.length) {
    return "Одно место нельзя указать дважды";
  }
  return null;
}
