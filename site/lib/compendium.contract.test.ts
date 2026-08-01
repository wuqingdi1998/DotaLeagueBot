import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../../bot/database/migrations/0039_compendium.sql");
const rerollMigration = source(
  "../../bot/database/migrations/0040_compendium_daily_rerolls.sql",
);
const checkRoute = source("../app/api/compendium/daily-quests/[questId]/check/route.ts");
const repository = source("../app/compendium/services/repository.ts");
const header = source("../app/components/SiteHeader.tsx");
const navigationCss = source("../app/styles/34-compendium-navigation.css");
const dashboard = source("../app/compendium/sections/CompendiumDashboard.tsx");
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
    expect(dashboard).toContain("/liquipedia-icon.svg");
    expect(headingCss).toContain(".compendium-liquipedia-link");
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

  it("stores at most one reroll per player and Moscow daily set", () => {
    expect(rerollMigration).toContain("UNIQUE (player_id, quest_set_id)");
    expect(rerollMigration).toContain("position BETWEEN 1 AND 4");
    expect(rerollRepository).toContain("pg_advisory_xact_lock");
    expect(rerollRepository).toContain(
      "CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow'",
    );
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
