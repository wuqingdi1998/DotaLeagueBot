import { calculateSeasonCooling } from "@/lib/season-cooling";
import { calculateSeasonPenalty } from "@/lib/season-discipline";
import type { PenaltyCoolingRow, PenaltyEventRow } from "./season-extra-query";
import type { RoundRow } from "./season-route-model";

export function seasonCoolingModifiers(
  rounds: RoundRow[],
  events: PenaltyEventRow[],
  approvals: PenaltyCoolingRow[],
) {
  const regularRounds = rounds.filter((round) => round.round_kind === "regular");
  const playerIds = [
    ...new Set([
      ...events.map((event) => event.player_id),
      ...approvals.map((approval) => approval.player_id),
    ]),
  ];
  const coolingProgress = playerIds.map((playerId) => {
    const state = calculateSeasonCooling(
      regularRounds.map((round) => ({
        roundNumber: round.round_number,
        isCompleted: round.status === "completed",
      })),
      events
        .filter((event) => event.player_id === playerId)
        .map((event) => ({ roundNumber: event.round_number, fires: event.fire_count })),
      approvals
        .filter((approval) => approval.player_id === playerId)
        .map((approval) => approval.round_number),
    );
    return {
      player_id: playerId,
      progress: state.progress,
      pending_round_id: regularRounds.find(
        (round) => round.round_number === state.pendingRoundNumber,
      )?.id ?? null,
      remaining_fires: state.remainingFires,
      applied_round_numbers: state.appliedRoundNumbers,
      invalid_round_numbers: state.invalidRoundNumbers,
    };
  });
  const penaltyStates = coolingProgress.map((progress) => {
    const state = calculateSeasonPenalty(
      [
        ...events
          .filter((event) => event.player_id === progress.player_id)
          .map((event) => ({
            roundNumber: event.round_number,
            fires: event.fire_count,
          })),
        ...progress.applied_round_numbers.map((roundNumber) => ({
          roundNumber,
          fires: -1,
        })),
      ],
      regularRounds.map((round) => round.round_number),
    );
    return { playerId: progress.player_id, ...state };
  });
  return { coolingProgress, penaltyStates };
}
