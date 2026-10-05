import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { assertCompendiumActive } from "../model/lifecycle";
import { scanRankedWins } from "../model/matches";
import { currentMoscowDay } from "../model/time";
import { dailyChallengeRewardStars } from "../model/weekend-bonus";
import { fetchRecentPlayerMatches } from "./opendota";
import { fetchOpenDotaMatchDetails } from "./opendota-match-details";
import { requireCompendiumDotaId } from "./participant";
import { consumeCheckAllowance, totalCompendiumStars } from "./repository";
import {
  loadClanMateDotaIds,
  loadClanOutingCompletion,
  recordClanOutingPair,
  type ClanOutingCompletion,
} from "./clan-outing-repository";

export async function loadClanOuting(
  playerId: string,
  dateKey: string,
): Promise<ClanOutingCompletion | null> {
  return loadClanOutingCompletion(playerId, dateKey);
}

export async function checkClanOuting(user: AuthUser, now = new Date()): Promise<{
  completion: ClanOutingCompletion;
  totalStars: number;
}> {
  assertCompendiumActive(now);
  const dotaId = requireCompendiumDotaId(user);
  const day = currentMoscowDay(now);
  const existing = await loadClanOutingCompletion(user.discordId, day.dateKey);
  if (existing) return { completion: existing, totalStars: await totalCompendiumStars(user.discordId) };
  if (!(await consumeCheckAllowance(user.discordId))) {
    throw new CompendiumError("RATE_LIMITED", "Слишком много проверок. Подождите минуту и попробуйте снова.");
  }
  const clanMates = await loadClanMateDotaIds(user.discordId);
  if (!clanMates.size) {
    throw new CompendiumError("NO_MATCH", "Не удалось найти участников вашего клана.");
  }
  const matches = await fetchRecentPlayerMatches(dotaId);
  const wins = scanRankedWins({ matches, dayStart: day.start, dayEnd: day.end, now });
  for (const win of wins) {
    const details = await fetchOpenDotaMatchDetails(win.matchId);
    const viewer = details.players.find((player) => player.accountId === dotaId);
    if (!viewer) continue;
    const isRadiant = viewer.playerSlot < 128;
    const partner = details.players.find((player) =>
      player.accountId !== null &&
      (player.playerSlot < 128) === isRadiant &&
      clanMates.has(player.accountId)
    );
    if (!partner?.accountId) continue;
    const clanMate = clanMates.get(partner.accountId)!;
    const completion = await recordClanOutingPair({
      playerId: user.discordId,
      partnerPlayerId: clanMate.playerId,
      dateKey: day.dateKey,
      matchId: win.matchId,
      rewardStars: dailyChallengeRewardStars(day.dateKey),
    });
    return { completion, totalStars: await totalCompendiumStars(user.discordId) };
  }
  throw new CompendiumError(
    "NO_MATCH",
    "Победа в рейтинговой игре вместе с участником вашего клана пока не найдена.",
  );
}
