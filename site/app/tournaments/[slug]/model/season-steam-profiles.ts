import { buildPlayerLinks, normalizeDotaAccountId } from "@/lib/player-links";
import { seasonTeamLineup } from "./season-lineup";
import type { SeasonMatch } from "./season-types";

export const seasonLobbyPlayerCount = 10;

export function seasonLobbySteamProfileUrls(match: SeasonMatch): string[] {
  return (["a", "b"] as const)
    .flatMap((teamSide) => seasonTeamLineup(match, teamSide))
    .filter((player) => !player.isFormerPlayer)
    .map((player) => normalizeDotaAccountId(player.dota_id))
    .filter((dotaId): dotaId is string => dotaId !== null)
    .map((dotaId) => buildPlayerLinks(dotaId).steam);
}
