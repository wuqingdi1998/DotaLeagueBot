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
const heroProgressMigration = source(
  "../../bot/database/migrations/0056_compendium_star_race_hero_progress.sql",
);
const raceEventsMigration = source(
  "../../bot/database/migrations/0057_compendium_star_race_exclude_runes.sql",
);
const tiebreakMigration = source(
  "../../bot/database/migrations/0058_compendium_star_race_d20_tiebreak.sql",
);
const reusableWeeksMigration = source(
  "../../bot/database/migrations/0059_compendium_star_race_weeks.sql",
);
const dashboard = source(
  "../app/compendium/sections/CompendiumDashboard.tsx",
);
const starRaceView = source(
  "../app/compendium/components/CompendiumStarRace.tsx",
);
const starRaceModel = source("../app/compendium/model/star-race.ts");
const starRacePrizesModel = source(
  "../app/compendium/model/star-race-prizes.ts",
);
const starRaceEvaluation = source(
  "../app/compendium/model/star-race-evaluation.ts",
);
const checkRoute = source(
  "../app/api/compendium/star-race/quests/[dateKey]/check/route.ts",
);
const repository = source(
  "../app/compendium/services/star-race-repository.ts",
);
const service = source("../app/compendium/services/star-race.ts");
const styles = source("../app/styles/46-compendium-star-race.css");
const summaryStyles = source(
  "../app/styles/48-compendium-star-race-summary.css",
);
const rewardsStyles = source("../app/styles/38-compendium-rewards.css");
const globalStyles = source("../app/globals.css");
const basePage = source("../app/compendium/base/page.tsx");
const baseView = source("../app/compendium/admin/CompendiumBase.tsx");
const archiveView = source(
  "../app/compendium/admin/CompendiumStarRaceArchive.tsx",
);
const archiveRepository = source(
  "../app/compendium/admin/star-race-archive-repository.ts",
);
const basePerformanceMigration = source(
  "../../bot/database/migrations/0069_compendium_base_performance.sql",
);
const archiveStyles = source(
  "../app/styles/49-compendium-star-race-archive.css",
);
const arcanaMigration = source(
  "../../bot/database/migrations/0073_compendium_arcana_parse_checks.sql",
);
const bonusQuestRaceMigration = source(
  "../../bot/database/migrations/0075_compendium_star_race_exclude_bonus_quest.sql",
);
const arcanaRepository = source(
  "../app/compendium/services/star-race-arcana-repository.ts",
);
const arcanaService = source(
  "../app/compendium/services/star-race-arcana.ts",
);
const parsedMatchService = source(
  "../app/compendium/services/opendota-match-details.ts",
);
const scheduler = source("../../bot/cogs/compendium_scheduler.py");

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
    expect(repository).toContain("FROM compendium_star_race_events");
    expect(repository).toContain("earned_at >= $1::timestamptz");
    expect(repository).toContain("earned_at < $2::timestamptz");
  });

  it("excludes Rune Challenge and daily Challenge 4 only from star-race totals", () => {
    expect(raceEventsMigration).toContain(
      "CREATE OR REPLACE VIEW compendium_star_race_events",
    );
    expect(raceEventsMigration).not.toContain(
      "compendium_rune_challenge_completions",
    );
    expect(migration).toContain("compendium_rune_challenge_completions");
    expect(migration).toContain("FROM compendium_star_events event");
    expect(bonusQuestRaceMigration).toContain(
      "CREATE OR REPLACE VIEW compendium_star_race_events",
    );
    expect(bonusQuestRaceMigration).toContain("daily_quest.position <> 4");
    expect(bonusQuestRaceMigration).not.toContain(
      "compendium_rune_challenge_completions",
    );
  });

  it("shows the signed-in player's unique rank from the same standings", () => {
    expect(repository).toContain("export async function loadPersonalStarRaceStars");
    expect(repository).toContain("event.player_id = $3");
    expect(repository).toContain("export async function loadStarRaceRank");
    expect(repository).toContain(
      "eligible_total.completed_race_quests DESC",
    );
    expect(repository).toContain("WHERE ranked_total.player_id = $4");
    expect(service).toContain("loadStarRaceRank(user.discordId, race)");
    expect(service).toContain("loadPersonalStarRaceStars(user.discordId, race)");
    expect(starRaceModel).toContain("personalStars: number | null");
    expect(starRaceModel).not.toContain("totalStars: number | null");
    expect(starRaceModel).toContain("personalRank: number | null");
    expect(starRaceView).toContain("Ваше место в гонке");
    expect(starRaceView).toContain("Ваш результат");
    expect(starRaceView).toContain("race.personalStars ?? 0");
    expect(starRaceView).not.toContain("race.totalStars");
    expect(starRaceView).toContain('race.personalRank ?? "—"');
    expect(styles).toContain(".compendium-star-race-rank-label");
    expect(styles).toContain("grid-row: 1 / 5");
  });

  it("breaks star ties by quests and persistent d20 rolls", () => {
    expect(repository).toContain("race_quest_counts AS");
    expect(repository).toContain(
      "FROM compendium_star_race_quest_completions completion",
    );
    expect(repository).toMatch(
      /ROW_NUMBER\(\) OVER \(\s*ORDER BY\s*eligible_total\.total_stars DESC,\s*eligible_total\.completed_race_quests DESC,\s*COALESCE\(tiebreak\.rolls/,
    );
    expect(repository).toContain(
      "ON CONFLICT (race_start_at, player_id) DO NOTHING",
    );
    expect(tiebreakMigration).toContain(
      "CREATE TABLE IF NOT EXISTS compendium_star_race_tiebreak_rolls",
    );
    expect(tiebreakMigration).toContain("CHECK (cardinality(rolls) = 64)");
    expect(repository).toContain("FLOOR(RANDOM() * 20) + 1");
    const leaderboardPage = source("../app/compendium/star-race/page.tsx");
    expect(leaderboardPage).toContain(
      "При равенстве звёзд выше располагается участник, выполнивший больше ежедневных заданий гонки",
    );
    expect(leaderboardPage).toContain(
      "сайт автоматически бросает 20-гранный кубик",
    );
    expect(leaderboardPage).toContain("общих мест в итоге не будет");
    expect(leaderboardPage).toContain("starRacePrizeDescription(race.prizes)");
    expect(starRacePrizesModel).toContain("Призы будут объявлены позже");
  });

  it("stores the two-star reward once and only during its Moscow day", () => {
    expect(migration).toContain("CHECK (reward_amount = 2)");
    expect(migration).toContain("UNIQUE (player_id, moscow_date)");
    expect(repository).toContain("pg_advisory_xact_lock");
    expect(repository).toContain("CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'");
  });

  it("allows future race weeks without removing earlier results", () => {
    expect(starRaceModel).toContain("STAR_RACE_WEEKS");
    expect(starRaceModel).toContain("CURRENT_STAR_RACE");
    expect(starRaceModel).toContain('id: "2026-08-17"');
    expect(starRaceModel).toContain('dateLabel: "17–23 августа 2026"');
    expect(repository).toContain("starRaceWeekByDate");
    expect(reusableWeeksMigration).toContain(
      "DROP CONSTRAINT IF EXISTS compendium_star_race_quest_completions_moscow_date_check",
    );
    expect(reusableWeeksMigration).toContain(
      "DROP CONSTRAINT IF EXISTS compendium_star_race_quest_progress_moscow_date_check",
    );
  });

  it("queues Arcana matches and checks them after five minutes", () => {
    expect(arcanaMigration).toContain(
      "CREATE TABLE IF NOT EXISTS compendium_star_race_arcana_checks",
    );
    expect(arcanaMigration).toContain("check_after");
    expect(arcanaMigration).toContain("UNIQUE (player_id, moscow_date, match_id)");
    expect(parsedMatchService).toContain("/api/request/");
    expect(parsedMatchService).toContain("item_rarity");
    expect(arcanaRepository).toContain("INTERVAL '5 minutes'");
    expect(arcanaRepository).toContain(
      "(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date - 1",
    );
    expect(arcanaService).toContain("hasPlayerEquippedArcana");
    expect(starRaceModel).toContain("pendingVerification");
    expect(starRaceView).toContain("pendingVerification");
    expect(starRaceView).toContain("onCheck(pendingQuest.dateKey)");
    expect(scheduler).toContain("@tasks.loop(minutes=1)");
    expect(scheduler).toContain("verify-arcana");
  });

  it("archives every configured week and its standings in the organizer base", () => {
    expect(basePage).toContain("loadCompendiumStarRaceArchive");
    expect(baseView).toContain("CompendiumStarRaceArchive");
    expect(archiveRepository).toContain("STAR_RACE_WEEKS.map");
    expect(archiveRepository).toContain("loadStarRaceLeaderboard(race, true)");
    expect(archiveRepository).toContain('phase === "upcoming"');
    expect(archiveRepository).toContain("loadFinishedRaceLeaderboard");
    expect(archiveRepository).toContain("compendium_star_race_standings_snapshots");
    expect(basePerformanceMigration).toContain(
      "compendium_star_race_standings_snapshots",
    );
    expect(archiveView).toContain("Сценарии Гонки");
    expect(archiveView).toContain("Итоговая таблица");
    expect(archiveStyles).toContain("@media (max-width: 720px)");
    expect(globalStyles).toContain(
      '@import "./styles/49-compendium-star-race-archive.css";',
    );
  });

  it("replaces Tuesday's scanned progress instead of adding it twice", () => {
    expect(progressMigration).toContain(
      "CREATE TABLE IF NOT EXISTS compendium_star_race_quest_progress",
    );
    expect(repository).toContain("progress_amount = EXCLUDED.progress_amount");
    expect(repository).not.toContain(
      "progress_amount + EXCLUDED.progress_amount",
    );
    expect(service).toContain("forceRefresh: true");
    expect(starRaceModel).toContain("winning-building-damage");
    expect(starRaceModel).toContain('return "Урон по строениям"');
    expect(starRaceModel).toContain('"Урон по героям"');
    expect(starRaceView).toContain("starRaceQuestProgressLabel(quest)");
  });

  it("persists Monday's partial hero win and renders its intermediate state", () => {
    expect(heroProgressMigration).toContain(
      "compendium_star_race_quest_progress_wins",
    );
    expect(repository).toContain("replaceStarRaceHeroProgress");
    expect(repository).toContain("DELETE FROM compendium_star_race_quest_progress_wins");
    expect(starRaceEvaluation).toContain("scanDistinctMatchingWins");
    expect(service).toContain("evaluateStarRaceRequirement");
    expect(starRaceView).toContain("isDimmed");
  });

  it("places the race after community rewards and hides details before launch", () => {
    expect(dashboard.indexOf("<CompendiumStarRace")).toBeGreaterThan(
      dashboard.indexOf("<CompendiumRewards"),
    );
    expect(starRaceModel).toContain('title: "Гонка за звёздами"');
    expect(starRaceView).toContain("race.title");
    expect(starRaceView).toContain("Гонка скоро начнётся");
    expect(starRaceView).toContain("isDetailsVisible");
    expect(starRacePrizesModel).toContain("Primeval Abomination");
    expect(starRacePrizesModel).toContain("Primal Beast");
  });

  it("previews prizes with images and leaves the third prize static", () => {
    expect(starRacePrizesModel).toContain("Beast of Thunder");
    expect(starRaceView).toContain("race.prizes.map");
    expect(starRaceView).toContain("Награда за топ-${prize.place}");
    expect(starRaceView).toContain("src={prize.imageUrl}");
    expect(starRaceView).toContain("prize.imageUrl ?");
    expect(starRaceView).toContain("compendium-star-race-prize-static");
    expect(starRacePrizesModel).toContain("The Lightning Orchid");
    expect(archiveView).toContain("prize.imageUrl ? (");
    expect(archiveView).toContain("is-image-free");
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

  it("places race rules between the compact counter and right-side prizes", () => {
    expect(starRaceView).toContain("Условия гонки");
    expect(starRaceModel).toContain(
      "Звёзды за Испытание Рун в гонке не учитываются, но всё так же",
    );
    expect(starRaceModel).toContain("учитываются в других зачётах.");
    expect(starRaceModel).toContain(
      "Звёзды за Испытание 4 также не учитываются в гонке",
    );
    expect(starRaceView).toContain("STAR_RACE_EXCLUSION_RULES.map");
    expect(summaryStyles).toContain(".compendium-star-race-rules");
    expect(styles).toContain(
      "grid-template-columns: minmax(210px, 0.46fr) minmax(420px, 1.12fr) minmax(380px, 0.92fr);",
    );
    expect(globalStyles).toContain(
      '@import "./styles/48-compendium-star-race-summary.css";',
    );
    expect(summaryStyles).toMatch(
      /\.compendium-star-race-rules ul\s*\{[^}]*padding-left:\s*0;[^}]*font-size:\s*15px;[^}]*list-style:\s*none;/,
    );
    expect(summaryStyles).toMatch(
      /\.compendium-star-race-rules strong\s*\{[^}]*font-size:\s*18px;/,
    );
    expect(starRaceView).toContain("keepGroupedNumbersTogether");
  });
});
