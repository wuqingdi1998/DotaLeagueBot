import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { OCTOBER_REWARD_STARS } from "./october-reward-thresholds";
import { selectProfileBadgesForDisplay } from "./profile-badges";

const db = new PGlite();
const migration = readFileSync(new URL("../../bot/database/migrations/0183_october_profile_badges.sql", import.meta.url), "utf8");
beforeAll(async () => {
  await db.exec(readFileSync(new URL("../tests/fixtures/october-compendium.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../bot/database/migrations/0170_isolate_october_compendium.sql", import.meta.url), "utf8"));
  await db.exec(`ALTER TABLE october_compendium_clan_members ADD COLUMN clan_id text DEFAULT 'morbus';
    UPDATE october_compendium_clan_members SET clan_id='panacea' WHERE player_id=200;
    INSERT INTO compendium_admin_star_adjustments VALUES (900,100,31,'2026-10-11 12:00+03','Admin',false);
    CREATE TABLE player_profile_badges(player_id bigint,badge_key text,source_event text,awarded_at timestamptz DEFAULT NOW(),PRIMARY KEY(player_id,badge_key));
    INSERT INTO player_profile_badges VALUES (100,'ti-2026-gold','the-international-2026-compendium',NOW());
    CREATE VIEW compendium_player_star_totals AS SELECT player.discord_id AS player_id,
      GREATEST(0,COALESCE(SUM(event.amount),0))::int AS total_stars FROM players player
      LEFT JOIN compendium_star_events event ON event.player_id=player.discord_id GROUP BY player.discord_id;`);
  await db.exec(migration);
}, 20000);
afterAll(async () => db.close());
async function badges(playerId = 100) {
  return (await db.query<{ badge_key: string }>("SELECT badge_key FROM player_profile_badges WHERE player_id=$1 ORDER BY badge_key", [playerId])).rows.map((row) => row.badge_key);
}
it("backfills current rewards, keeps archived badges separate, and matches the public reward thresholds", async () => {
  expect(await badges()).toContain("october-2026-morbus-silver");
  expect(await badges()).toContain("ti-2026-gold");
  expect(await badges(200)).toEqual([]);
  for (const [tier, threshold] of Object.entries({ bronze: OCTOBER_REWARD_STARS.bronzeBadge, silver: OCTOBER_REWARD_STARS.silverBadge,
    gold: OCTOBER_REWARD_STARS.goldBadge, platinum: OCTOBER_REWARD_STARS.platinumBadge })) {
    expect(migration).toContain(`('${tier}', ${threshold})`);
  }
});
it("grants a clan badge in the award transaction and upgrades it at each threshold", async () => {
  let id = 901;
  for (const [amount, tier] of [[10, "bronze"], [30, "silver"], [40, "gold"], [40, "platinum"]] as const) {
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO compendium_admin_star_adjustments(id,player_id,amount,created_at) VALUES($1,200,$2,'2026-10-11 12:00+03')", [id++, amount]);
      const earned = (await tx.query<{ badge_key: string }>("SELECT badge_key FROM player_profile_badges WHERE player_id=200")).rows;
      expect(selectProfileBadgesForDisplay(earned.map((row) => row.badge_key))).toEqual([`october-2026-panacea-${tier}`]);
    });
  }
});
it("preserves the highest permanent badge after corrections and does not count old or ineligible stars", async () => {
  await db.exec("INSERT INTO compendium_admin_star_adjustments VALUES (999,200,-120,'2026-10-11 13:00+03','Admin',false)");
  expect(selectProfileBadgesForDisplay(await badges(200))).toEqual(["october-2026-panacea-platinum"]);
  expect(await badges(300)).toEqual([]);
});
it("covers every star source and clan assignment without depending on the old TI badge triggers", async () => {
  const sources = ["compendium_user_quest_completions", "compendium_admin_star_adjustments", "compendium_prediction_rewards",
    "october_compendium_rune_challenge_completions", "compendium_star_race_quest_completions", "october_compendium_clan_outing_completions", "october_compendium_clan_members"];
  const triggers = (await db.query<{ table_name: string }>(`SELECT event_object_table AS table_name FROM information_schema.triggers
    WHERE trigger_name LIKE 'zz_october_%'`)).rows;
  expect(new Set(triggers.map((row) => row.table_name))).toEqual(new Set(sources));
});
