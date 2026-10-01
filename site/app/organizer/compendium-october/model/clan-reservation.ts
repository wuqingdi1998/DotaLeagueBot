import type { OctoberClanId } from "./clans";
import type { OctoberCompendiumPhase } from "./release";

export type OctoberClanReservationState = {
  phase: OctoberCompendiumPhase;
  isAuthenticated: boolean;
  canReserve: boolean;
  accessRoleName: string | null;
  selectedClanId: OctoberClanId | null;
};

export class OctoberClanReservationError extends Error {
  constructor(
    readonly code: "RESERVATION_CLOSED" | "RUNE_REQUIRED",
    message: string,
  ) {
    super(message);
  }
}
