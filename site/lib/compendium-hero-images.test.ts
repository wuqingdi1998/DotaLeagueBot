import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMPENDIUM_HERO_IMAGE_URLS,
  COMPENDIUM_HEROES,
  compendiumHeroImageSource,
} from "../app/compendium/model/heroes";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const heroChoice = source("../app/compendium/components/HeroChoice.tsx");
const dashboard = source(
  "../app/compendium/sections/CompendiumDashboard.tsx",
);
const imageRoute = source(
  "../app/api/compendium/heroes/[key]/route.ts",
);

describe("compendium hero image loading", () => {
  it("uses same-site, versioned URLs for every hero portrait", () => {
    expect(COMPENDIUM_HERO_IMAGE_URLS).toHaveLength(COMPENDIUM_HEROES.length);
    expect(new Set(COMPENDIUM_HERO_IMAGE_URLS)).toHaveLength(
      COMPENDIUM_HEROES.length,
    );
    expect(
      COMPENDIUM_HERO_IMAGE_URLS.every((url) =>
        url.startsWith("/api/compendium/heroes/"),
      ),
    ).toBe(true);
  });

  it("only resolves known hero keys to the Steam image source", () => {
    expect(compendiumHeroImageSource("antimage")).toBe(
      "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png",
    );
    expect(compendiumHeroImageSource("antimage", "vertical")).toBe(
      "https://courier.spectral.gg/images/dota/portraits_vert/antimage.png",
    );
    expect(compendiumHeroImageSource("../../secret")).toBeNull();
  });

  it("loads today's portraits eagerly and preloads the full catalog", () => {
    expect(heroChoice).toContain('loading="eager"');
    expect(dashboard).toContain("CompendiumHeroImagePreloader");
  });

  it("serves portraits with a one-year immutable browser cache", () => {
    expect(imageRoute).toContain("force-cache");
    expect(imageRoute).toContain("max-age=31536000, immutable");
    expect(imageRoute).toContain("compendiumHeroImageSource");
  });
});
