import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0053_compendium_star_race.sql",
);
const progressMigration = source(
  "../../bot/database/migrations/0055_compendium_star_race_progress.sql",
);
const dashboard = source(
  "../app/compendium/sections/CompendiumDashboard.tsx",
);
const starRaceView = source(
  "../app/compendium/components/CompendiumStarRace.tsx",
);
const starRaceModel = source("../app/compendium/model/star-race.ts");
const checkRoute = source(
  "../app/api/compendium/star-race/quests/[dateKey]/check/route.ts",
);
const repository = source(
  "../app/compendium/services/star-race-repository.ts",
);
const service = source("../app/compendium/services/star-race.ts");
const styles = source("../app/styles/46-compendium-star-race.css");
const rewardsStyles = source("../app/styles/38-compendium-rewards.css");

describe("compendium star race contract", () => {
  it("counts every current star source inside the race period", () => {
    for (const table of [
      "compendium_user_quest_completions",
      "compendium_admin_star_adjustments",
      "compendium_prediction_rewards",
      "compendium_rune_challenge_completions",
      "compendium_star_race_quest_completions",
    ]) {
      expect(migration).toContain(table);
    }
    expect(migration).toContain("CREATE OR REPLACE VIEW compendium_star_events");
    expect(repository).toContain("FROM compendium_star_events");
    expect(repository).toContain("earned_at >= $1::timestamptz");
    expect(repository).toContain("earned_at < $2::timestamptz");
  });

  it("shows the signed-in player's tied rank from the same race standings", () => {
    expect(repository).toContain("export async function loadStarRaceRank");
    expect(repository).toContain(
      "RANK() OVER (ORDER BY eligible_total.total_stars DESC)",
    );
    expect(repository).toContain("WHERE ranked_total.player_id = $3");
    expect(service).toContain("loadStarRaceRank(user.discordId)");
    expect(starRaceModel).toContain("personalRank: number | null");
    expect(starRaceView).toContain("Ваше место в гонке");
    expect(starRaceView).toContain('race.personalRank ?? "—"');
    expect(styles).toContain(".compendium-star-race-rank-label");
    expect(styles).toContain("grid-row: 1 / 5");
  });

  it("stores the two-star reward once and only during its Moscow day", () => {
    expect(migration).toContain("CHECK (reward_amount = 2)");
    expect(migration).toContain("UNIQUE (player_id, moscow_date)");
    expect(repository).toContain("pg_advisory_xact_lock");
    expect(repository).toContain("CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'");
  });

  it("replaces Tuesday's scanned progress instead of adding it twice", () => {
    expect(progressMigration).toContain(
      "CREATE TABLE IF NOT EXISTS compendium_star_race_quest_progress",
    );
    expect(repository).toContain("progress_amount = EXCLUDED.progress_amount");
    expect(repository).not.toContain(
      "progress_amount + EXCLUDED.progress_amount",
    );
    expect(service).toContain(
      'forceRefresh: quest.requirement.kind === "winning-building-damage"',
    );
    expect(starRaceModel).toContain("winning-building-damage");
    expect(starRaceView).toContain("Урон по строениям");
  });

  it("places the race after community rewards and hides details before launch", () => {
    expect(dashboard.indexOf("<CompendiumStarRace")).toBeGreaterThan(
      dashboard.indexOf("<CompendiumRewards"),
    );
    expect(starRaceView).toContain("Гонка за звёздами");
    expect(starRaceView).toContain("Гонка скоро начнётся");
    expect(starRaceView).toContain("isDetailsVisible");
    expect(starRaceModel).toContain("Primeval Abomination");
    expect(starRaceModel).toContain("Primal Beast");
  });

  it("previews each top-two prize image from its visibly interactive name", () => {
    expect(starRaceModel).toContain("Beast of Thunder");
    expect(starRaceView).toContain("race.prizes.map");
    expect(starRaceView).toContain("Награда за топ-${prize.place}");
    expect(starRaceView).toContain("src={prize.imageUrl}");
    expect(starRaceView).toContain('role="tooltip"');
    expect(starRaceView).toContain("tabIndex={0}");
    expect(starRaceView).not.toContain("href={prize.imageUrl}");
    expect(styles).toContain(
      ".compendium-star-race-prize-name:hover .compendium-star-race-prize-preview",
    );
    expect(styles).toContain("border-bottom: 1px dashed");
  });

  it("identifies the checked player only through the signed-in session", () => {
    expect(checkRoute).toContain("const user = await requireSession()");
    expect(checkRoute).not.toContain("playerId");
  });

  it("keeps the seven quest cards usable on phones", () => {
    expect(styles).toContain(".compendium-star-race-quests");
    expect(styles).toMatch(/@media \(max-width: 720px\)/);
  });

  it("uses the shared star gold and readable section labels", () => {
    expect(styles).toContain("--star-race-gold: #f1b92d");
    expect(styles).toMatch(
      /\.compendium-star-race-heading span\s*\{[^}]*color:\s*var\(--star-race-gold\);[^}]*font-size:\s*14px;/,
    );
    expect(rewardsStyles).toMatch(
      /\.compendium-reward-track-heading span\s*\{[^}]*color:\s*var\(--blue-soft\);[^}]*font-size:\s*14px;/,
    );
  });
});
