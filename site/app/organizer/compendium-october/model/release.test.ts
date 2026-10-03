import { describe, expect, it } from "vitest";
import {
  octoberCompendiumPhase,
  octoberDailyRewardStars,
  OCTOBER_CLAN_FORMATION_AT,
  OCTOBER_CLAN_PUBLICATION_AT,
  OCTOBER_PUBLIC_LAUNCH_AT,
  OCTOBER_RESERVATION_ROLE_NAMES,
} from "./release";

describe("October compendium release schedule", () => {
  it.each([
    ["2026-10-03T17:59:59.999Z", "hidden"],
    ["2026-10-03T18:00:00.000Z", "reservation"],
    ["2026-10-05T20:49:59.999Z", "reservation"],
    ["2026-10-05T20:50:00.000Z", "formation"],
    ["2026-10-05T20:59:59.999Z", "formation"],
    ["2026-10-05T21:00:00.000Z", "published"],
  ] as const)("uses the exact Moscow boundary at %s", (now, phase) => {
    expect(octoberCompendiumPhase(new Date(now))).toBe(phase);
  });

  it("keeps the three public moments explicit", () => {
    expect(OCTOBER_PUBLIC_LAUNCH_AT).toBe("2026-10-03T21:00:00+03:00");
    expect(OCTOBER_CLAN_FORMATION_AT).toBe("2026-10-05T23:50:00+03:00");
    expect(OCTOBER_CLAN_PUBLICATION_AT).toBe("2026-10-06T00:00:00+03:00");
  });

  it("allows every rune except Water and the Supporters subscription level", () => {
    expect(OCTOBER_RESERVATION_ROLE_NAMES).toEqual([
      "Руна Регенерации",
      "Руна Ускорения",
      "Руна Невидимости",
      "Руна Волшебства",
      "Руна Иллюзий",
      "Руна Усиления урона",
      "Суппортеры",
    ]);
    expect(OCTOBER_RESERVATION_ROLE_NAMES).not.toContain("Руна Воды");
  });

  it.each([
    ["2026-10-03", 2],
    ["2026-10-04", 2],
    ["2026-10-05", 1],
    ["2026-10-09", 1],
    ["2026-10-10", 2],
  ] as const)("shows the current day's exact reward on %s", (dateKey, stars) => {
    expect(octoberDailyRewardStars(dateKey)).toBe(stars);
  });
});
