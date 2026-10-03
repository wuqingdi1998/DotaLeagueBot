import { one, query } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import type { OctoberClanId } from "../model/clans";
import {
  OctoberClanReservationError,
  type OctoberClanReservationState,
} from "../model/clan-reservation";
import {
  octoberCompendiumPhase,
  OCTOBER_RESERVATION_ROLE_NAMES,
} from "../model/release";

type ReservationAccessRow = {
  role_name: string | null;
  clan_id: OctoberClanId | null;
};

async function reservationAccess(
  playerId: string,
): Promise<ReservationAccessRow> {
  return (await one<ReservationAccessRow>(
    `SELECT
       (
         SELECT role.role_name
         FROM player_discord_roles role
         WHERE role.player_id = $1
           AND role.role_name = ANY($2::text[])
         ORDER BY array_position($2::text[], role.role_name)
         LIMIT 1
       ) AS role_name,
       reservation.clan_id
     FROM players player
     LEFT JOIN october_compendium_clan_reservations reservation
       ON reservation.player_id = player.discord_id
     WHERE player.discord_id = $1
       AND player.is_archived = FALSE`,
    [playerId, OCTOBER_RESERVATION_ROLE_NAMES],
  )) ?? { role_name: null, clan_id: null };
}

export async function loadOctoberClanReservationState(
  user: AuthUser | null,
  now: Date = new Date(),
): Promise<OctoberClanReservationState> {
  const phase = octoberCompendiumPhase(now);
  if (!user || user.isStandaloneOrganizer) {
    return {
      phase,
      isAuthenticated: false,
      canReserve: false,
      accessRoleName: null,
      selectedClanId: null,
    };
  }
  const access = await reservationAccess(user.discordId);
  return {
    phase,
    isAuthenticated: true,
    canReserve: phase === "reservation" && access.role_name !== null,
    accessRoleName: access.role_name,
    selectedClanId: access.clan_id,
  };
}

export async function reserveOctoberClan(
  playerId: string,
  clanId: OctoberClanId,
  now: Date = new Date(),
  options: { allowBeforeLaunch?: boolean } = {},
): Promise<OctoberClanReservationState> {
  const phase = octoberCompendiumPhase(now);
  const isReservationOpen = phase === "reservation"
    || (phase === "hidden" && options.allowBeforeLaunch === true);
  if (!isReservationOpen) {
    throw new OctoberClanReservationError(
      "RESERVATION_CLOSED",
      "Бронирование мест уже закрыто",
    );
  }
  const access = await reservationAccess(playerId);
  if (!access.role_name) {
    throw new OctoberClanReservationError(
      "RUNE_REQUIRED",
      "У вас нет подходящего уровня подписки",
    );
  }
  await query(
    `INSERT INTO october_compendium_clan_reservations
       (player_id, clan_id, reserved_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (player_id) DO UPDATE
     SET clan_id = EXCLUDED.clan_id,
         updated_at = NOW()`,
    [playerId, clanId],
  );
  return {
    phase: "reservation",
    isAuthenticated: true,
    canReserve: true,
    accessRoleName: access.role_name,
    selectedClanId: clanId,
  };
}
