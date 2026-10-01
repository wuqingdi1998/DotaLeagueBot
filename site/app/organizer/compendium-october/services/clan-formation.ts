import { assignOctoberClans } from "../model/clan-assignment";
import { OCTOBER_CLAN_FORMATION_AT } from "../model/release";
import {
  claimOctoberClanFormation,
  completeOctoberClanFormation,
  failOctoberClanFormation,
  loadOctoberFormationCandidates,
} from "./clan-formation-repository";
import { loadOctoberOpenDotaActivity } from "./opendota-clan-activity";

export type OctoberFormationResult = {
  status: "waiting" | "running" | "complete";
  playerCount: number;
};

export async function formOctoberClans(
  now: Date = new Date(),
): Promise<OctoberFormationResult> {
  if (now.getTime() < Date.parse(OCTOBER_CLAN_FORMATION_AT)) {
    return { status: "waiting", playerCount: 0 };
  }
  const claim = await claimOctoberClanFormation();
  if (!claim.shouldRun) {
    return {
      status: claim.status === "complete" ? "complete" : "running",
      playerCount: 0,
    };
  }
  try {
    const candidates = await loadOctoberFormationCandidates();
    const activityByPlayer = await loadOctoberOpenDotaActivity(candidates);
    const assignments = assignOctoberClans(
      candidates.map((candidate) => {
        const activity = activityByPlayer.get(candidate.discordId);
        return {
          discordId: candidate.discordId,
          reservation: candidate.reservation,
          previousCompendiumStars: candidate.previousCompendiumStars,
          matchesLastThreeMonths: activity?.matchesLastThreeMonths ?? 0,
          rankedMatchesLastThreeMonths:
            activity?.rankedMatchesLastThreeMonths ?? 0,
          internalRating: candidate.internalRating,
          rankTier: candidate.rankTier,
        };
      }),
    );
    await completeOctoberClanFormation({
      candidates,
      activityByPlayer,
      assignments,
    });
    return { status: "complete", playerCount: assignments.length };
  } catch (error) {
    await failOctoberClanFormation(error);
    throw error;
  }
}
