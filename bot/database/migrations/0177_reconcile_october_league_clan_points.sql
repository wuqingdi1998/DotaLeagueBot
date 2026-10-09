-- League awards already contribute to personal stars; synchronize the standings
-- without inserting rewards again or touching archived Compendium operations.
UPDATE october_compendium_clan_members member
SET total_points = total.total_stars
FROM compendium_player_star_totals total
WHERE total.player_id = member.player_id
  AND EXISTS (
      SELECT 1 FROM compendium_admin_star_adjustments adjustment
      WHERE adjustment.player_id = member.player_id
        AND adjustment.season_match_id IS NOT NULL
        AND adjustment.created_at >= TIMESTAMPTZ '2026-10-05 00:00:00+03'
        AND adjustment.created_at < TIMESTAMPTZ '2026-10-26 00:00:00+03'
        AND compendium_stars_count_for_player(adjustment.player_id, adjustment.created_at)
  );
