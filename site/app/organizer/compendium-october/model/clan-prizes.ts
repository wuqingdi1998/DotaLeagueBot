export type OctoberClanPrizePool = "winners" | "runners-up";

export type OctoberClanPrize = {
  id: string;
  pool: OctoberClanPrizePool;
  poolPosition: number;
  name: string | null;
  imagePath: string | null;
  approximateValue: string | null;
};

type OctoberClanPrizeDetails = Pick<
  OctoberClanPrize,
  "name" | "imagePath" | "approximateValue"
>;

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

const shatteredGreatswordPrize = {
  name: "Shattered Greatsword",
  imagePath: "/compendium/october/shattered-greatsword.png",
  approximateValue: "6 000 ₽",
} as const;

function clanPrizeSlots(
  pool: OctoberClanPrizePool,
  count: number,
  prizesByPosition: Readonly<Partial<Record<number, OctoberClanPrizeDetails>>>,
): OctoberClanPrize[] {
  return emptyPrizeSlots(pool, count).map((prize) => {
    const prizeDetails = prizesByPosition[prize.poolPosition];
    return prizeDetails ? { ...prize, ...prizeDetails } : prize;
  });
}

export const OCTOBER_CLAN_PRIZES: readonly OctoberClanPrize[] = [
  ...clanPrizeSlots("winners", 7, {
    1: shatteredGreatswordPrize,
    6: steamGiftCardPrize,
    7: steamGiftCardPrize,
  }),
  ...clanPrizeSlots("runners-up", 3, { 3: steamGiftCardPrize }),
];
