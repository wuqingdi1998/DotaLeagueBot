import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../../bot/database/migrations/0039_compendium.sql");
const rerollMigration = source(
  "../../bot/database/migrations/0040_compendium_daily_rerolls.sql",
);
const rewardsMigration = source(
  "../../bot/database/migrations/0042_compendium_rewards.sql",
);
const adminStarsMigration = source(
  "../../bot/database/migrations/0043_compendium_admin_stars.sql",
);
const checkRoute = source("../app/api/compendium/daily-quests/[questId]/check/route.ts");
const repository = source("../app/compendium/services/repository.ts");
const header = source("../app/components/SiteHeader.tsx");
const navigationCss = source("../app/styles/34-compendium-navigation.css");
const dashboard = source("../app/compendium/sections/CompendiumDashboard.tsx");
const compendiumCss = source("../app/styles/33-compendium.css");
const headingCss = source("../app/styles/35-compendium-heading.css");
const basePage = source("../app/compendium/base/page.tsx");
const baseRepository = source("../app/compendium/admin/repository.ts");
const baseView = source("../app/compendium/admin/CompendiumBase.tsx");
const rerollRoute = source(
  "../app/api/compendium/daily-quests/[questId]/reroll/route.ts",
);
const rerollRepository = source(
  "../app/compendium/services/reroll-repository.ts",
);
const questCard = source("../app/compendium/components/QuestCard.tsx");
const rewards = source("../app/compendium/components/CompendiumRewards.tsx");
const rerollNotice = source("../app/compendium/components/DailyRerollNotice.tsx");
const profilePage = source("../app/players/[dotaId]/page.tsx");
const rewardsCss = source("../app/styles/38-compendium-rewards.css");
const baseViewTypes = source("../app/compendium/admin/types.ts");

describe("compendium persistence and security contract", () => {
  it("stores one shared quest set per Moscow date", () => {
    expect(migration).toContain("moscow_date DATE NOT NULL UNIQUE");
  });

  it("prevents a hero from appearing twice in one daily set", () => {
    expect(migration).toContain("UNIQUE (quest_set_id, hero_id)");
  });

  it("prevents duplicate rewards for one player quest", () => {
    expect(migration).toContain("UNIQUE (player_id, daily_quest_id)");
    expect(repository).toContain("ON CONFLICT (player_id, daily_quest_id) DO NOTHING");
  });

  it("serializes parallel completion requests", () => {
    expect(repository).toContain("pg_advisory_xact_lock");
    expect(repository).toContain("compendium-quest-mutation:");
  });

  it("checks the active Moscow date inside the reward transaction", () => {
    expect(repository).toContain("CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'");
  });

  it("identifies the rewarded player only through the server session", () => {
    expect(checkRoute).toContain("const user = await requireSession()");
    expect(checkRoute).not.toContain("userId");
  });

  it("keeps reward amount fixed by a database check", () => {
    expect(migration).toContain("CHECK (reward_amount = 1)");
  });

  it("adds the compendium to desktop and mobile navigation", () => {
    expect(header.match(/href="\/compendium"/g)).toHaveLength(2);
    expect(header.match(/compendium-navigation-link/g)).toHaveLength(2);
  });

  it("highlights the compendium navigation with an accessible gold shimmer", () => {
    expect(navigationCss).toContain("@keyframes compendium-gold-shimmer");
    expect(navigationCss).toContain("animation: compendium-gold-shimmer");
    expect(navigationCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("shows the 2026 event and links its official Liquipedia page", () => {
    expect(dashboard).toContain("The International 2026");
    expect(dashboard).toContain("https://liquipedia.net/dota2/The_International/2026");
    expect(dashboard).toContain("Страница турнира на Liquipedia");
    expect(dashboard).toContain("/liquipedia-icon.svg");
    expect(headingCss).toContain(".compendium-liquipedia-link");
  });

  it("keeps the hero compact and removes the temporary star summary", () => {
    expect(dashboard).not.toContain(
      "Побеждайте на героях дня и собирайте звёзды сообщества.",
    );
    expect(dashboard).not.toContain("Ваши звёзды");
    expect(compendiumCss).toContain("min-height: 300px");
    expect(compendiumCss).toContain("padding: 40px 0 24px");
    expect(headingCss).toContain(".compendium-tournament-countdown strong");
  });

  it("places the reset countdown beside the daily quest heading", () => {
    const headingStart = dashboard.indexOf('className="compendium-section-heading"');
    const questGridStart = dashboard.indexOf('className="compendium-quest-grid"');
    const heading = dashboard.slice(headingStart, questGridStart);
    expect(heading).toContain("До новых заданий");
    expect(heading).toContain("{countdown}");
    expect(headingCss).toContain(".compendium-section-countdown");
  });

  it("shows the tournament countdown in place of today's Moscow date", () => {
    expect(dashboard).toContain("ДО ТУРНИРА");
    expect(dashboard).toContain("tournamentCountdown");
    expect(dashboard).not.toContain("Сегодня по Москве");
  });

  it("shows the hidden base link only in organizer mode", () => {
    expect(dashboard).toContain("isOrganizer &&");
    expect(dashboard).toContain('href="/compendium/base"');
    expect(dashboard).toContain("compendium-base-floating-link");
    expect(headingCss).toContain(".compendium-base-floating-link");
    expect(headingCss).toMatch(
      /\.compendium-base-floating-link\s*\{[^}]*position:\s*absolute;/,
    );
    expect(basePage).toContain("if (!user?.isAdmin) notFound()");
  });

  it("loads every participant and the four heroes behind each rewarded star", () => {
    expect(baseRepository).toContain("FROM players player");
    expect(baseRepository).toContain("compendium_user_quest_completions");
    expect(baseRepository).toContain("compendium_daily_quest_heroes");
    expect(baseView).toContain("reward.heroes.map");
    expect(baseView).toContain("hero.id === reward.matchedHeroId");
  });

  it("shows participant avatars and links Dota IDs to site profiles", () => {
    expect(baseRepository).toContain("player.avatar_url");
    expect(baseRepository).toContain("latest_session.discord_avatar_url");
    expect(baseView).toContain("participant.avatarUrl");
    expect(baseView).toContain("`/players/${participant.dotaId}`");
  });

  it("upgrades daily rerolls from one to a persistent three-reroll allowance", () => {
    expect(rerollMigration).toContain("UNIQUE (player_id, quest_set_id)");
    expect(rewardsMigration).toContain(
      "DROP CONSTRAINT IF EXISTS compendium_user_quest_rerolls_player_id_quest_set_id_key",
    );
    expect(rerollMigration).toContain("position BETWEEN 1 AND 4");
    expect(rerollRepository).toContain("REROLL_REWARD_STAR_THRESHOLD");
    expect(repository).toContain("ORDER BY reroll.used_at DESC, reroll.id DESC");
    expect(rerollRepository).toContain("pg_advisory_xact_lock");
    expect(rerollRepository).toContain(
      "CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'",
    );
  });

  it("shows the verification notice beside the half-width reroll strip", () => {
    expect(rerollNotice).toContain(
      "Учитываются только рейтинговые победы завершенные до 23:59 текущего",
    );
    expect(dashboard).not.toContain('className="compendium-note"');
    expect(dashboard).not.toContain("К турнирам сообщества");
  });

  it("shows personal and community reward tracks after the quests", () => {
    expect(rewards).toContain("Личный зачёт");
    expect(rewards).toContain("Зачёт сообщества");
    expect(dashboard.indexOf("<CompendiumRewards")).toBeGreaterThan(
      dashboard.indexOf('className={`compendium-quest-grid'),
    );
  });

  it("unlocks a fourth six-hero quest and TI profile badges", () => {
    expect(rewardsMigration).toContain("CHECK (position BETWEEN 1 AND 4)");
    expect(rewardsMigration).toContain("CHECK (position BETWEEN 1 AND 6)");
    expect(repository).toContain("BONUS_QUEST_STAR_THRESHOLD");
    expect(profilePage).toContain("profile.compendiumBadge");
    expect(profilePage).toContain("CompendiumBadge");
  });

  it("uses admin adjustments in every compendium star total", () => {
    expect(adminStarsMigration).toContain("compendium_admin_star_adjustments");
    expect(adminStarsMigration).toContain("compendium_player_star_totals");
    expect(repository).toContain("compendium_player_star_totals");
    expect(baseRepository).toContain("compendium_admin_star_adjustments");
    expect(baseViewTypes).toContain('kind: "admin"');
  });

  it("keeps reward text readable and makes mobile quests swipe horizontally", () => {
    expect(rewardsCss).toContain("font-size: 15px");
    expect(compendiumCss).toContain("scroll-snap-type: x mandatory");
    expect(compendiumCss).toContain("overflow-x: auto");
    expect(dashboard).toContain("compendium-mobile-swipe-hint");
  });

  it("identifies the reroll owner from the session and updates one card", () => {
    expect(rerollRoute).toContain("const user = await requireSession()");
    expect(rerollRoute).not.toContain("userId");
    expect(dashboard).toContain("rerollsRemaining");
    expect(dashboard).toContain("quest.id === questId");
    expect(questCard).toContain("compendium-reroll-button");
  });

  it("checks and reports the player's rerolled four-hero card", () => {
    expect(repository).toContain("compendium_user_quest_reroll_heroes");
    expect(repository).toContain("reroll.player_id = $3");
    expect(repository).toContain(
      "`compendium-quest-mutation:${input.playerId}:${input.questId}`",
    );
    expect(rerollRepository).toContain(
      "`compendium-quest-mutation:${input.playerId}:${input.questId}`",
    );
    expect(baseRepository).toContain("compendium_user_quest_reroll_heroes");
  });
});
