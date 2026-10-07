import { assignOctoberClans } from "../model/clan-assignment";
import {
  OCTOBER_CLAN_FORMATION_AT,
  OCTOBER_CLAN_PUBLICATION_AT,
} from "../model/release";
import {
  claimOctoberClanPreparation,
  failOctoberClanFormation,
  loadOctoberFormationCandidates,
} from "./clan-formation-repository";
import {
  publishApprovedOctoberClans,
  saveOctoberClanFormationDraft,
} from "./clan-launch-repository";
import { loadOctoberOpenDotaActivity } from "./opendota-clan-activity";

export type OctoberPreparationResult = {
  status: "waiting" | "preparing" | "ready";
  playerCount: number;
  notifiedOrganizers: number;
};

/** Builds the reviewable draft without publishing any clan membership. */
export async function prepareOctoberClans(
  now: Date = new Date(),
): Promise<OctoberPreparationResult> {
  if (now.getTime() < Date.parse(OCTOBER_CLAN_FORMATION_AT)) {
    return { status: "waiting", playerCount: 0, notifiedOrganizers: 0 };
  }
  const claim = await claimOctoberClanPreparation();
  if (!claim.shouldRun) {
    return {
      status: ["review", "approved", "cancelled", "complete"].includes(claim.status)
        ? "ready"
        : "preparing",
      playerCount: 0,
      notifiedOrganizers: 0,
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
          activityStatus: activity?.status ?? "unavailable",
          matchesLastThreeMonths: activity?.matchesLastThreeMonths ?? 0,
          rankedMatchesLastThreeMonths:
            activity?.rankedMatchesLastThreeMonths ?? 0,
          internalRating: candidate.internalRating,
          rankTier: candidate.rankTier,
        };
      }),
    );
    const notifiedOrganizers = await saveOctoberClanFormationDraft({
      candidates,
      activityByPlayer,
      assignments,
    });
    return {
      status: "ready",
      playerCount: assignments.length,
      notifiedOrganizers,
    };
  } catch (error) {
    await failOctoberClanFormation(error);
    throw error;
  }
}

/** Publishes only an organizer-approved draft at or after the scheduled start. */
export async function publishOctoberClans(now: Date = new Date()) {
  if (now.getTime() < Date.parse(OCTOBER_CLAN_PUBLICATION_AT)) {
    return { status: "waiting" as const };
  }
  const status = await publishApprovedOctoberClans();
  return { status };
}
