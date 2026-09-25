export const OCTOBER_CLANS = [
  {
    id: "morbus",
    name: "Морбус",
    emblem: "/compendium/october/morbus-emblem-v2.webp",
  },
  {
    id: "panacea",
    name: "Панацея",
    emblem: "/compendium/october/panacea-emblem.webp",
  },
] as const;

export type OctoberClanId = (typeof OCTOBER_CLANS)[number]["id"];
