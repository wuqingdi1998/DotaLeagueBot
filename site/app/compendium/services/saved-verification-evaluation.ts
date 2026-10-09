import { CompendiumError } from "../model/errors";
import { findMatchingWin, scanRankedWins } from "../model/matches";
import { evaluateStarRaceRequirement } from "../model/star-race-evaluation";
import { hasPendingStarRaceStatistics } from "../model/star-race-statistics";
import type { VerificationSnapshot } from "../model/verification-retries";
import { fetchRecentPlayerMatches } from "./opendota";
import { fetchOpenDotaMatchDetails } from "./opendota-match-details";
import type { MatchingWin } from "../model/types";

export type VerifiedChallengeEvidence = { wins: MatchingWin[]; partnerPlayerId?: string };

export async function evaluateSavedVerification(snapshot: VerificationSnapshot, now = new Date()): Promise<VerifiedChallengeEvidence> {
  const historyDays = Math.max(1, Math.ceil((now.getTime() - Date.parse(snapshot.startsAt)) / 86_400_000));
  const matches = await fetchRecentPlayerMatches(snapshot.dotaId, { forceRefresh: true, historyDays });
  const window = { matches, dayStart: new Date(snapshot.startsAt), dayEnd: new Date(snapshot.endsAt), now };
  if (snapshot.kind === "star_race" && snapshot.requirement) {
    if (hasPendingStarRaceStatistics({ ...window, requirement: snapshot.requirement })) {
      throw new CompendiumError("OPEN_DOTA_UNAVAILABLE", "OpenDota ещё не передал статистику подходящих матчей");
    }
    const result = evaluateStarRaceRequirement({ ...window, requirement: snapshot.requirement });
    if (result.isComplete) {
      const requirement = snapshot.requirement;
      const count = requirement.kind === "ranked-wins" ? requirement.requiredWins
        : requirement.kind === "distinct-hero-wins" ? requirement.requiredDistinctWins : result.wins.length;
      return { wins: result.wins.slice(0, count) };
    }
  } else if (snapshot.kind === "clan_outing") {
    for (const win of scanRankedWins(window)) {
      const details = await fetchOpenDotaMatchDetails(win.matchId);
      const viewer = details.players.find((player) => player.accountId === snapshot.dotaId);
      if (!viewer) continue;
      const partner = details.players.find((player) => player.accountId !== null
        && (player.playerSlot < 128) === (viewer.playerSlot < 128)
        && snapshot.clanMates.some((mate) => mate.dotaId === player.accountId));
      const mate = snapshot.clanMates.find((mate) => mate.dotaId === partner?.accountId);
      if (mate) return { wins: [win], partnerPlayerId: mate.playerId };
    }
  } else {
    const win = findMatchingWin({ ...window, heroIds: snapshot.heroIds });
    if (win) return { wins: [win] };
  }
  throw new CompendiumError("NO_MATCH", "Подходящий результат за исходную дату задания пока не найден");
}
