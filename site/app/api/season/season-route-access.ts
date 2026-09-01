import { one } from "@/lib/db";
import type { TournamentStatus } from "@/lib/tournaments";
import {
  priorityRegistrationAdministratorId,
  priorityRegistrationRoleIds,
} from "@/lib/season-round-registration";

export type SeasonTournament = {
  id: number;
  tournament_type: string;
  status: TournamentStatus;
};

export async function loadSeasonTournament(
  slug: string,
  isOrganizer: boolean,
): Promise<SeasonTournament | null> {
  return one<SeasonTournament>(
    `SELECT id::int, tournament_type, status
     FROM tournaments
     WHERE slug = $1 ${isOrganizer ? "" : "AND status <> 'draft'"}`,
    [slug],
  );
}

export async function hasPriorityRegistrationAccess(
  playerId: string | undefined,
): Promise<boolean> {
  if (!playerId) return false;
  if (playerId === priorityRegistrationAdministratorId) return true;
  const access = await one<{ has_access: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM player_discord_roles
       WHERE player_id = $1
         AND role_id = ANY($2::bigint[])
     ) AS has_access`,
    [playerId, priorityRegistrationRoleIds],
  );
  return access?.has_access ?? false;
}
