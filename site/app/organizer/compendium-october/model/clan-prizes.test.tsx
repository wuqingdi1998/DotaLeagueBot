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
  it("adds all missing winners and runners-up slots to the second strip", () => {
    const html = renderToStaticMarkup(<OctoberClanPrizeBoard />);

    expect(OCTOBER_CLAN_PRIZES).toHaveLength(20);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.map(
      (prize) => `${prize.pool}:${prize.poolPosition}`,
    )).toEqual([
      "winners:8",
      "winners:9",
      "winners:10",
      "winners:11",
      "winners:12",
      "winners:13",
      "winners:14",
      "runners-up:4",
      "runners-up:5",
      "runners-up:6",
    ]);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => prize.name).map((prize) => prize.name))
      .toEqual(additionalPrizeNames);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => prize.name).every(
      (prize) => prize.pool === "winners" && prize.approximateValue === "200 ₽",
    )).toBe(true);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => !prize.name)).toHaveLength(5);
    expect(html).toContain('aria-label="Дополнительные призовые слоты кланового зачёта"');
    expect(html.match(/data-prize-row="additional"/g)).toHaveLength(10);
  });

  it("uses a prepared transparent preview for every new prize", () => {
    for (const prize of OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => prize.name)) {
      expect(prize.imagePath).toBeTruthy();
      expect(existsSync(new URL(`../../../../public${prize.imagePath}`, import.meta.url)))
        .toBe(true);
    }
  });
});
