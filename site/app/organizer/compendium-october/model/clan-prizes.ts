export type OctoberClanPrizePool = "winners" | "runners-up";

export type OctoberClanPrize = {
  id: string;
  pool: OctoberClanPrizePool;
  poolPosition: number;
  name: string | null;
  imagePath: string | null;
  thumbnailImagePath: string | null;
  approximateValue: string | null;
  hasLargePreview: boolean;
};

type OctoberClanPrizeDetails = Pick<
  OctoberClanPrize,
  "name" | "imagePath" | "approximateValue"
> & Partial<Pick<OctoberClanPrize, "thumbnailImagePath" | "hasLargePreview">>;

function emptyPrizeSlots(
  pool: OctoberClanPrizePool,
  count: number,
  startPosition = 1,
): OctoberClanPrize[] {
  return Array.from({ length: count }, (_, index) => {
    const poolPosition = startPosition + index;
    return {
      id: `${pool}-${poolPosition}`,
      pool,
      poolPosition,
      name: null,
      imagePath: null,
      thumbnailImagePath: null,
      approximateValue: null,
      hasLargePreview: false,
    };
  });
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

const undyingLovePrize = {
  name: "Undying Love",
  imagePath: "/compendium/october/undying-love.png",
  thumbnailImagePath: "/compendium/october/undying-love-thumbnail.png",
  approximateValue: "700 ₽",
  hasLargePreview: true,
} as const;

const magusMimicryPrize = {
  name: "Magus Mimicry",
  imagePath: "/compendium/october/magus-mimicry.png",
  thumbnailImagePath: "/compendium/october/magus-mimicry-thumbnail.png",
  approximateValue: "600 ₽",
} as const;

const snailfirePrize = {
  name: "Snailfire",
  imagePath: "/compendium/october/snailfire.png",
  thumbnailImagePath: "/compendium/october/snailfire-thumbnail.png",
  approximateValue: "600 ₽",
} as const;

const additionalWinnerPrizes: Readonly<Partial<Record<number, OctoberClanPrizeDetails>>> = {
  9: {
    name: "Almond the Frondillo",
    imagePath: "/compendium/october/almond-the-frondillo.png",
    thumbnailImagePath: "/compendium/october/almond-the-frondillo-thumbnail.png",
    approximateValue: "300 ₽",
  },
  10: {
    name: "The Igneous Stone",
    imagePath: "/compendium/october/the-igneous-stone.png",
    approximateValue: "300 ₽",
  },
  11: {
    name: "Altar Ball",
    imagePath: "/compendium/october/altar-ball.png",
    approximateValue: "200 ₽",
  },
  12: {
    name: "Cursed Crescent",
    imagePath: "/compendium/october/cursed-crescent.png",
    approximateValue: "200 ₽",
  },
  13: {
    name: "The Lightning Orchid",
    imagePath: "/compendium/october/the-lightning-orchid.png",
    approximateValue: "200 ₽",
  },
  14: {
    name: "Golden Fortune's Tout",
    imagePath: "/compendium/october/golden-fortunes-tout.png",
    approximateValue: "200 ₽",
  },
};

function clanPrizeSlots(
  pool: OctoberClanPrizePool,
  count: number,
  prizesByPosition: Readonly<Partial<Record<number, OctoberClanPrizeDetails>>>,
  startPosition = 1,
): OctoberClanPrize[] {
  return emptyPrizeSlots(pool, count, startPosition).map((prize) => {
    const prizeDetails = prizesByPosition[prize.poolPosition];
    return prizeDetails ? { ...prize, ...prizeDetails } : prize;
  });
}

export const OCTOBER_CLAN_PRIMARY_PRIZES: readonly OctoberClanPrize[] = [
  ...clanPrizeSlots("winners", 7, {
    1: shatteredGreatswordPrize,
    3: undyingLovePrize,
    4: magusMimicryPrize,
    5: snailfirePrize,
    6: steamGiftCardPrize,
    7: steamGiftCardPrize,
  }),
  ...clanPrizeSlots("runners-up", 3, { 3: steamGiftCardPrize }),
];

export const OCTOBER_CLAN_ADDITIONAL_PRIZES: readonly OctoberClanPrize[] = [
  ...clanPrizeSlots("winners", 7, additionalWinnerPrizes, 8),
  ...clanPrizeSlots("runners-up", 3, {}, 4),
];

export const OCTOBER_CLAN_PRIZES: readonly OctoberClanPrize[] = [
  ...OCTOBER_CLAN_PRIMARY_PRIZES,
  ...OCTOBER_CLAN_ADDITIONAL_PRIZES,
];
