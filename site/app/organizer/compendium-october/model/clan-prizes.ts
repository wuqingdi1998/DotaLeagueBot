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

export const OCTOBER_CLAN_PRIZES: readonly OctoberClanPrize[] = [
  ...emptyPrizeSlots("winners", 7),
  ...emptyPrizeSlots("runners-up", 3),
];
