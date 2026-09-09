import { one, query } from "@/lib/db";

export type TournamentHeroPreference = {
  isCollapsed: boolean;
};

const defaultTournamentHeroPreference: TournamentHeroPreference = {
  isCollapsed: false,
};

export async function loadTournamentHeroPreference(
  playerId: string | null,
  tournamentId: number,
): Promise<TournamentHeroPreference> {
  if (!playerId) return defaultTournamentHeroPreference;

  return (
    (await one<TournamentHeroPreference>(
      `SELECT is_collapsed AS "isCollapsed"
       FROM tournament_hero_preferences
       WHERE tournament_id = $1 AND player_id = $2`,
      [tournamentId, playerId],
    )) ?? defaultTournamentHeroPreference
  );
}

export async function saveTournamentHeroPreference(
  playerId: string,
  tournamentId: number,
  isCollapsed: boolean,
): Promise<void> {
  await query(
    `INSERT INTO tournament_hero_preferences
       (tournament_id, player_id, is_collapsed, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tournament_id, player_id) DO UPDATE
     SET is_collapsed = EXCLUDED.is_collapsed,
         updated_at = NOW()`,
    [tournamentId, playerId, isCollapsed],
  );
}
