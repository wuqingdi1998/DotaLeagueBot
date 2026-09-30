import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import {
  OCTOBER_CLAN_ADDITIONAL_PRIZES,
  OCTOBER_CLAN_PRIZES,
} from "./clan-prizes";

const additionalPrizeNames = [
  "Almond the Frondillo",
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
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => prize.name).map(
      (prize) => `${prize.poolPosition}:${prize.approximateValue}`,
    )).toEqual(["9:300 ₽", "10:300 ₽", "11:200 ₽", "12:200 ₽", "13:200 ₽", "14:200 ₽"]);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => !prize.name)).toHaveLength(4);
    expect(html).toContain('aria-label="Дополнительные призовые слоты кланового зачёта"');
    expect(html.match(/data-prize-row="additional"/g)).toHaveLength(10);
    expect(html).toContain("Как получить звёзды?");
    expect(html).toContain("Все способы получить звёзды");
    expect(html).toContain("Максимум без подписки и Fastcup");
    expect(html).toContain("Абсолютный максимум");
    expect(html).toContain("161");
    expect(html).toContain("191");
    expect(html).toContain("203");
    expect(html.match(/class="october-star-guide-reward-stars"/g)).toHaveLength(12);
  });

  it("uses a prepared transparent preview for every new prize", () => {
    for (const prize of OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => prize.name)) {
      expect(prize.imagePath).toBeTruthy();
      expect(existsSync(new URL(`../../../../public${prize.imagePath}`, import.meta.url)))
        .toBe(true);
    }
  });

  it("adds the four requested winner prizes with dedicated readable thumbnails", () => {
    const requestedPrizes = OCTOBER_CLAN_PRIZES.filter(
      (prize) => prize.pool === "winners" && [3, 4, 5, 9].includes(prize.poolPosition),
    );

    expect(requestedPrizes.map((prize) => ({
      position: prize.poolPosition,
      name: prize.name,
      value: prize.approximateValue,
      thumbnail: prize.thumbnailImagePath,
      largePreview: prize.hasLargePreview,
    }))).toEqual([
      {
        position: 3,
        name: "Undying Love",
        value: "700 ₽",
        thumbnail: "/compendium/october/undying-love-thumbnail.png",
        largePreview: true,
      },
      {
        position: 4,
        name: "Magus Mimicry",
        value: "600 ₽",
        thumbnail: "/compendium/october/magus-mimicry-thumbnail.png",
        largePreview: false,
      },
      {
        position: 5,
        name: "Snailfire",
        value: "600 ₽",
        thumbnail: "/compendium/october/snailfire-thumbnail.png",
        largePreview: false,
      },
      {
        position: 9,
        name: "Almond the Frondillo",
        value: "300 ₽",
        thumbnail: null,
        largePreview: false,
      },
    ]);

    for (const prize of requestedPrizes) {
      expect(prize.imagePath).toBeTruthy();
      expect(existsSync(new URL(`../../../../public${prize.imagePath}`, import.meta.url)))
        .toBe(true);
      if (prize.thumbnailImagePath) {
        expect(existsSync(new URL(
          `../../../../public${prize.thumbnailImagePath}`,
          import.meta.url,
        ))).toBe(true);
      }
    }
  });
});
