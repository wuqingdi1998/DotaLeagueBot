import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../../bot/database/migrations/0039_compendium.sql");
const checkRoute = source("../app/api/compendium/daily-quests/[questId]/check/route.ts");
const repository = source("../app/compendium/services/repository.ts");
const header = source("../app/components/SiteHeader.tsx");
const navigationCss = source("../app/styles/34-compendium-navigation.css");

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
    expect(repository).toContain("compendium-completion:");
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
});
