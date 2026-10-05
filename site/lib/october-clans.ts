export const OCTOBER_CLANS = [
  {
    id: "morbus",
    name: "Морбус",
    emblem: "/compendium/october/morbus-emblem.png",
  },
  {
    id: "panacea",
    name: "Панацея",
    emblem: "/compendium/october/panacea-emblem.png",
  },
] as const;

export type OctoberClanId = (typeof OCTOBER_CLANS)[number]["id"];
