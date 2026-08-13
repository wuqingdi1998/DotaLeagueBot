import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const basePage = source("../app/compendium/base/page.tsx");
const baseRepository = source("../app/compendium/admin/repository.ts");
const baseView = source("../app/compendium/admin/CompendiumBase.tsx");
const baseHistoryRoute = source(
  "../app/api/admin/compendium-base/participants/[playerId]/history/route.ts",
);
const baseLoading = source("../app/compendium/base/loading.tsx");
const performanceMigration = source(
  "../../bot/database/migrations/0069_compendium_base_performance.sql",
);

describe("compendium organizer base performance", () => {
  it("loads reward history only after an organizer opens one player", () => {
    expect(baseRepository).toContain("FROM players player");
    expect(baseRepository).toContain("compendium_user_quest_completions");
    expect(baseRepository).toContain("compendium_daily_quest_heroes");
    expect(baseRepository).toContain("compendium_star_race_quest_completions");
    expect(baseRepository).toContain("compendium_star_race_quest_wins");
    expect(baseView).toContain("reward.heroes.map");
    expect(baseView).toContain("hero.id === reward.matchedHeroId");
    expect(baseView).toContain("/api/admin/compendium-base/participants/");
    expect(baseView).toContain("participant.rewardCount");
    expect(baseHistoryRoute).toContain("requireAdmin()");
    expect(baseHistoryRoute).toContain("loadCompendiumAdminParticipantHistory");
    expect(basePage).not.toContain("ensureDailyQuestSet");
  });

  it("fetches all latest avatars in one indexed query", () => {
    expect(baseRepository).toContain("player.avatar_url");
    expect(baseRepository).toContain("latest_avatars");
    expect(baseRepository).toContain("DISTINCT ON (session.discord_id)");
    expect(performanceMigration).toContain("web_sessions_latest_avatar_idx");
    expect(baseView).toContain("participant.avatarUrl");
    expect(baseView).toContain("`/players/${participant.dotaId}`");
  });

  it("shows immediate feedback while the organizer base is loading", () => {
    expect(baseLoading).toContain("Открываем Базу");
    expect(baseLoading).toContain("Загружаем участников и текущие результаты");
  });
});
