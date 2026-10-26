import { one } from "@/lib/db";
import { compendiumPeriodTables } from "@/app/compendium/model/period";
import { loadCompendiumStarRaceArchive } from "@/app/compendium/admin/star-race-archive-repository";

export async function loadArchivedCompendium(playerId: string) {
  const tables = compendiumPeriodTables("ti-2026");
  const [stars, races] = await Promise.all([
    one<{ community_stars: number; personal_stars: number }>(
      `SELECT COALESCE(SUM(total_stars), 0)::int AS community_stars,
         COALESCE(MAX(total_stars) FILTER (WHERE player_id = $1), 0)::int AS personal_stars
       FROM ${tables.totals}`, [playerId],
    ),
    loadCompendiumStarRaceArchive(new Date(), "ti-2026"),
  ]);
  return { communityStars: Number(stars?.community_stars ?? 0), personalStars: Number(stars?.personal_stars ?? 0), races };
}
