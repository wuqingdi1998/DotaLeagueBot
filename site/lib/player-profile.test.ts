import { describe, expect, it } from "vitest";
import {
  buildPlayerLinks,
  customizableSubscriptionRoleNames,
  normalizeDotaAccountId,
  profileBackgroundForSubscriptionRole,
  profileBackgroundKeys,
  subscriptionRoleNames,
  tournamentResultLabel,
} from "./player-profile";
import {
  profileBadgeDefinition,
  selectProfileBadgesForDisplay,
  ti2026ProfileBadgeForStars,
} from "./profile-badges";

describe("public player profile", () => {
  it("normalizes a public Dota account id", () => {
    expect(normalizeDotaAccountId("301109815")).toBe("301109815");
    expect(normalizeDotaAccountId("0301109815")).toBe("301109815");
    expect(normalizeDotaAccountId("not-an-id")).toBeNull();
    expect(normalizeDotaAccountId("4294967296")).toBeNull();
  });

  it("builds Dotabuff, Stratz and Steam links from the shared player id", () => {
    expect(buildPlayerLinks("301109815")).toEqual({
      dotabuff: "https://www.dotabuff.com/players/301109815",
      stratz: "https://stratz.com/players/301109815",
      steam: "https://steamcommunity.com/profiles/76561198261375543",
    });
  });

  it("prefers an organizer result label and has readable fallbacks", () => {
    expect(tournamentResultLabel(2, "Финалист", "finished")).toBe("Финалист");
    expect(tournamentResultLabel(3, null, "finished")).toBe("3-е место");
    expect(tournamentResultLabel(null, null, "active")).toBe("Участвует");
    expect(tournamentResultLabel(null, null, "archived")).toBe(
      "Результат пока не указан",
    );
  });

  it("allows every colored rune except the water rune to customize a profile", () => {
    expect(subscriptionRoleNames).toContain("Руна Воды");
    expect(customizableSubscriptionRoleNames).not.toContain("Руна Воды");
    expect(customizableSubscriptionRoleNames).toHaveLength(6);
    expect(profileBackgroundKeys).toEqual([
      "default",
      "regeneration",
      "haste",
      "invisibility",
      "arcane",
      "illusion",
      "damage",
    ]);
  });

  it("selects the standard profile background from the current rune", () => {
    expect(profileBackgroundForSubscriptionRole("Руна Иллюзий")).toBe(
      "illusion",
    );
    expect(profileBackgroundForSubscriptionRole("Руна Ускорения")).toBe(
      "haste",
    );
    expect(profileBackgroundForSubscriptionRole("Руна Воды")).toBe("default");
    expect(profileBackgroundForSubscriptionRole(null)).toBe("default");
  });

  it("describes permanent TI 2026 profile badges independently of the event page", () => {
    expect(ti2026ProfileBadgeForStars(10)).toBe("ti-2026-bronze");
    expect(ti2026ProfileBadgeForStars(40)).toBe("ti-2026-silver");
    expect(ti2026ProfileBadgeForStars(75)).toBe("ti-2026-gold");
    expect(profileBadgeDefinition("ti-2026-gold")).toMatchObject({
      label: "Бейдж Компендиума TI 2026 (золотой)",
      tier: "gold",
    });
    expect(profileBadgeDefinition("unknown-badge")).toBeNull();
  });

  it("shows only the highest earned badge from the same event", () => {
    expect(
      selectProfileBadgesForDisplay([
        "ti-2026-bronze",
        "unknown-badge",
        "ti-2026-gold",
        "ti-2026-silver",
      ]),
    ).toEqual(["ti-2026-gold"]);
  });
});
