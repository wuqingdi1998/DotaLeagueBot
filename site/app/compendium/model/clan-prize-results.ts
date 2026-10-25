import { OCTOBER_CLANS, type OctoberClanId } from "@/lib/october-clans";
import {
  OCTOBER_CLAN_PRIZES,
  type OctoberClanPrizePool,
} from "@/app/organizer/compendium-october/model/clan-prizes";

const clanDraws: Record<OctoberClanPrizePool, {
  clanId: OctoberClanId;
  label: string;
  recipientNames: readonly string[];
}> = {
  winners: {
    clanId: "panacea",
    label: "Победивший клан",
    recipientNames: [
      "confuse~",
      ".Purvs",
      "Sinister=)",
      "Sanraizu",
      "aura",
      "1lynya<3",
      "frokeng",
      "Gavr",
      "dravzen",
      "AlaStoR",
      "cy119",
      "humblegod",
      "greencat",
      "sobriety",
      "Fayde",
      "#яхочуумереть",
      "ДЕД_ЕСЕНИН",
      "N4ZE",
      "MirrorShard",
      "Pohs",
      "Ame's bastard",
    ],
  },
  "runners-up": {
    clanId: "morbus",
    label: "Проигравший клан",
    recipientNames: [
      "Gary",
      "seabain",
      "ls~",
      "TeMan",
      "chep",
      "Pancake",
      "GOLDEN PAPI",
      "lavchik",
      "Mazadox",
    ],
  },
};

export const OCTOBER_CLAN_PRIZE_RESULTS = Object.entries(clanDraws).map(([pool, draw]) => {
  const clan = OCTOBER_CLANS.find((clan) => clan.id === draw.clanId);
  if (!clan) throw new Error(`Unknown prize draw clan: ${draw.clanId}`);
  const prizes = draw.recipientNames.map((recipientName, index) => {
    const prize = OCTOBER_CLAN_PRIZES.find((prize) =>
      prize.pool === pool && prize.poolPosition === index + 1,
    );
    if (!prize?.name || !prize.imagePath) {
      throw new Error(`Missing clan prize: ${pool}-${index + 1}`);
    }
    return { ...prize, name: prize.name, imagePath: prize.imagePath, recipientName };
  });
  return { pool, label: draw.label, clan, prizes };
});
