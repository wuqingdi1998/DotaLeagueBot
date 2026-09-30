import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import {
  OCTOBER_CLAN_ADDITIONAL_PRIZES,
  OCTOBER_CLAN_PRIZES,
} from "./clan-prizes";

const additionalPrizeNames = [
  "The Igneous Stone",
  "Altar Ball",
  "Cursed Crescent",
  "The Lightning Orchid",
  "Golden Fortune's Tout",
];

describe("October clan prizes", () => {
  it("adds a second winners prize strip for places 10 through 14", () => {
    const html = renderToStaticMarkup(<OctoberClanPrizeBoard />);

    expect(OCTOBER_CLAN_PRIZES).toHaveLength(15);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.map((prize) => prize.poolPosition))
      .toEqual([10, 11, 12, 13, 14]);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.map((prize) => prize.name))
      .toEqual(additionalPrizeNames);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.every(
      (prize) => prize.pool === "winners" && prize.approximateValue === "200 ₽",
    )).toBe(true);
    expect(html).toContain('aria-label="Дополнительные призы победителей, места с 10 по 14"');
    expect(html.match(/data-prize-row="additional"/g)).toHaveLength(5);
  });

  it("uses a prepared transparent preview for every new prize", () => {
    for (const prize of OCTOBER_CLAN_ADDITIONAL_PRIZES) {
      expect(prize.imagePath).toBeTruthy();
      expect(existsSync(new URL(`../../../../public${prize.imagePath}`, import.meta.url)))
        .toBe(true);
    }
  });
});
