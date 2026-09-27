import type { OctoberClanId } from "./clans";

export type OctoberClanMember = {
  discordId: string;
  dotaId: string;
  playerName: string;
  clanId: OctoberClanId;
};
