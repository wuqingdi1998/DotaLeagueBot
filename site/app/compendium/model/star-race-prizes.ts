export type StarRacePrize = {
  readonly place: number;
  readonly title: string;
  readonly imageUrl: string | null;
};

export const FIRST_STAR_RACE_PRIZES = [
  {
    place: 1,
    title: "Сет Beast of Thunder на Storm Spirit",
    imageUrl: "/compendium/star-race/beast-of-thunder-storm-spirit.gif",
  },
  {
    place: 2,
    title: "Сет Primeval Abomination на Primal Beast",
    imageUrl: "/compendium/star-race/primeval-abomination-primal-beast.jpg",
  },
] as const satisfies readonly StarRacePrize[];

export const SECOND_STAR_RACE_PRIZES = [
  {
    place: 1,
    title: "Набор наград «Тёмного карнавала»",
    imageUrl: "/compendium/star-race/dark-carnival-reward-set.webp",
  },
  {
    place: 2,
    title: "Treasure of Wonders ×2",
    imageUrl: "/compendium/star-race/treasure-of-wonders.webp",
  },
  {
    place: 3,
    title: "The Lightning Orchid",
    imageUrl: "/compendium/star-race/the-lightning-orchid.webp",
  },
] as const satisfies readonly StarRacePrize[];

export function starRacePrizeDescription(
  prizes: readonly StarRacePrize[],
): string {
  if (prizes.length === 0) return "Призы будут объявлены позже.";
  const [first, second, third] = prizes;
  let description = `Награда за первое место — ${first.title}`;
  if (second) description += `; за второе — ${second.title}`;
  if (third) description += `; за третье — ${third.title}`;
  return `${description}.`;
}
