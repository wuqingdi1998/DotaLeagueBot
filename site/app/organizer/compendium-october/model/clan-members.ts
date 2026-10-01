import type { OctoberClanId } from "./clans";

export type OctoberClanMember = {
  discordId: string;
  dotaId: string;
  playerName: string;
  avatarUrl: string | null;
  clanId: OctoberClanId;
  totalPoints: number;
  isReserved?: boolean;
};
