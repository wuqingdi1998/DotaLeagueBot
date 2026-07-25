import { describe, expect, it } from "vitest";
import {
  buildPlayerLinks,
  normalizeDotaAccountId,
  tournamentResultLabel,
} from "./player-profile";

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
});
