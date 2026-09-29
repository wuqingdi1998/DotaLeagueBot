export type OctoberClanPrizePool = "winners" | "runners-up";

export type OctoberClanPrize = {
  id: string;
  pool: OctoberClanPrizePool;
  poolPosition: number;
  name: string | null;
  imagePath: string | null;
  approximateValue: string | null;
};

function emptyPrizeSlots(
  pool: OctoberClanPrizePool,
  count: number,
): OctoberClanPrize[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${pool}-${index + 1}`,
    pool,
    poolPosition: index + 1,
    name: null,
    imagePath: null,
    approximateValue: null,
  }));
}

const steamGiftCardPrize = {
  name: "Steam Gift Card на 500 ₽",
  imagePath: "/compendium/october/steam-gift-card-500-rub.png",
  approximateValue: "500 ₽",
} as const;

function clanPrizeSlots(
  pool: OctoberClanPrizePool,
  count: number,
  steamGiftCardPositions: readonly number[],
): OctoberClanPrize[] {
  return emptyPrizeSlots(pool, count).map((prize) =>
    steamGiftCardPositions.includes(prize.poolPosition)
      ? { ...prize, ...steamGiftCardPrize }
      : prize,
  );
}

export const OCTOBER_CLAN_PRIZES: readonly OctoberClanPrize[] = [
  ...clanPrizeSlots("winners", 7, [6, 7]),
  ...clanPrizeSlots("runners-up", 3, [3]),
];
