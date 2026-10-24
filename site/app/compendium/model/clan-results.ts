import { OCTOBER_CLANS } from "@/lib/october-clans";

export type CompendiumClanResult = (typeof OCTOBER_CLANS)[number] & {
  stars: number;
  outcome: "winner" | "loser" | "tie" | "pending";
};

export function compendiumClanResults(totals: readonly { clan_id: string; stars: number }[], isFinished: boolean): CompendiumClanResult[] {
  const clans = OCTOBER_CLANS.map((clan) => ({ ...clan, stars: Number(totals.find((total) => total.clan_id === clan.id)?.stars ?? 0) }));
  const maximum = Math.max(...clans.map((clan) => clan.stars));
  const isTie = clans.every((clan) => clan.stars === maximum);
  return clans.map((clan) => ({ ...clan, outcome: !isFinished ? "pending" : isTie ? "tie" : clan.stars === maximum ? "winner" : "loser" }));
}
