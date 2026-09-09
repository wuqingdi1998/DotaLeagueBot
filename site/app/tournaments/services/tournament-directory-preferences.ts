import type { TournamentDirectoryPreferences } from "../hub/tournament-hub-model";
import { one, query } from "@/lib/db";

const defaultTournamentDirectoryPreferences: TournamentDirectoryPreferences = {
  shouldHideArchivedTournaments: false,
};

export async function loadTournamentDirectoryPreferences(
  playerId: string | null,
): Promise<TournamentDirectoryPreferences> {
  if (!playerId) return defaultTournamentDirectoryPreferences;

  return (
    (await one<TournamentDirectoryPreferences>(
      `SELECT should_hide_archived_tournaments
         AS "shouldHideArchivedTournaments"
       FROM player_profile_preferences
       WHERE player_id = $1`,
      [playerId],
    )) ?? defaultTournamentDirectoryPreferences
  );
}

export async function saveTournamentDirectoryPreferences(
  playerId: string,
  shouldHideArchivedTournaments: boolean,
): Promise<void> {
  await query(
    `INSERT INTO player_profile_preferences
       (player_id, should_hide_archived_tournaments, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (player_id) DO UPDATE
     SET should_hide_archived_tournaments = EXCLUDED.should_hide_archived_tournaments,
         updated_at = NOW()`,
    [playerId, shouldHideArchivedTournaments],
  );
}
