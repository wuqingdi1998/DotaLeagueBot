import { describe, expect, it } from "vitest";
import { COMPENDIUM_HEROES } from "../../compendium/model/heroes";
import {
  ENABLED_FEARLESS_DRAFT_HEROES,
  FEARLESS_DRAFT_HEROES,
  HERO_ATTRIBUTE_GROUPS,
  isFearlessDraftHeroEnabled,
} from "./heroes";

describe("Fearless Draft hero catalog", () => {
  it("derives every hero from the shared site catalog", () => {
    expect(FEARLESS_DRAFT_HEROES.map((hero) => hero.id)).toEqual(
      COMPENDIUM_HEROES.map((hero) => hero.id),
    );
  });

  it("exposes centralized Captain's Mode availability", () => {
    expect(ENABLED_FEARLESS_DRAFT_HEROES.length).toBeGreaterThan(100);
    expect(isFearlessDraftHeroEnabled(ENABLED_FEARLESS_DRAFT_HEROES[0].id)).toBe(true);
    expect(isFearlessDraftHeroEnabled(-1)).toBe(false);
  });

  it("places every hero into one of the four Dota attribute groups", () => {
    const attributes = new Set(FEARLESS_DRAFT_HEROES.map((hero) => hero.primaryAttribute));
    expect(attributes).toEqual(new Set(HERO_ATTRIBUTE_GROUPS.map((group) => group.key)));
    expect(FEARLESS_DRAFT_HEROES).toHaveLength(127);
  });
});
