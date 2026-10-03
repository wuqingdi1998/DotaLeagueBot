import type { OctoberClanId } from "./clans";
import type { OctoberCompendiumPhase } from "./release";

export type OctoberClanReservationState = {
  phase: OctoberCompendiumPhase;
  isAuthenticated: boolean;
  canReserve: boolean;
  accessRoleName: string | null;
  selectedClanId: OctoberClanId | null;
};

export function octoberReservationForStartedPreview(
  state: OctoberClanReservationState,
  isTournamentStarted: boolean,
): OctoberClanReservationState {
  if (!isTournamentStarted || state.phase !== "hidden") return state;
  return {
    ...state,
    phase: "reservation",
    canReserve: state.isAuthenticated && state.accessRoleName !== null,
  };
}

export class OctoberClanReservationError extends Error {
  constructor(
    readonly code: "RESERVATION_CLOSED" | "RUNE_REQUIRED",
    message: string,
  ) {
    super(message);
  }
}
