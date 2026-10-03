import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import {
  OCTOBER_CLAN_ADDITIONAL_PRIZES,
  OCTOBER_CLAN_PRIZES,
  OCTOBER_CLAN_SMALL_PRIZES,
} from "./clan-prizes";

const additionalPrizeNames = [
  "Frostmoot",
  "Almond the Frondillo",
  "The Igneous Stone",
  "Altar Ball",
  "Cursed Crescent",
  "The Lightning Orchid",
  "Golden Fortune's Tout",
  "Golden Bloodfeather Feast",
  "Steam Gift Card на 100 ₽",
  "Steam Gift Card на 100 ₽",
];

describe("October clan prizes", () => {
  it("places the runners-up 500 ruble prize at second place", () => {
    const runnersUpPrize = OCTOBER_CLAN_PRIZES.find(
      (prize) => prize.pool === "runners-up" && prize.name === "Steam Gift Card на 500 ₽",
    );
    expect(runnersUpPrize?.poolPosition).toBe(2);
  });

  it("adds all missing winners and runners-up slots to the second strip", () => {
    const html = renderToStaticMarkup(<OctoberClanPrizeBoard />);

    expect(OCTOBER_CLAN_PRIZES).toHaveLength(30);
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
    )).toEqual([
      "8:500 ₽",
      "9:300 ₽",
      "10:300 ₽",
      "11:200 ₽",
      "12:200 ₽",
      "13:200 ₽",
      "14:200 ₽",
      "4:200 ₽",
      "5:100 ₽",
      "6:100 ₽",
    ]);
    expect(OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => !prize.name)).toHaveLength(0);
    expect(html).toContain('aria-label="Дополнительные призовые слоты кланового зачёта"');
    expect(html.match(/data-prize-row="additional"/g)).toHaveLength(10);
    expect(html).toContain("Как получить звёзды?");
    expect(html).toContain("Все способы получить звёзды");
    expect(html).toContain("Максимум без подписки и Fastcup");
    expect(html).toContain("Абсолютный максимум");
    expect(html).toContain("161");
    expect(html).toContain("191");
    expect(html).toContain("203");
    expect(html.match(/class="october-star-guide-reward-stars"/g)).toHaveLength(16);
    expect(html).toContain("Для Boosty-подписчиков рун кроме Руны Воды");
    expect(html.indexOf("Испытание Рун")).toBeLessThan(html.indexOf("Гонка за звёздами"));
  });

  it("puts the requested prizes into runners-up places 4–9", () => {
    const html = renderToStaticMarkup(<OctoberClanPrizeBoard />);

    expect(OCTOBER_CLAN_SMALL_PRIZES.map(
      (prize) => `${prize.pool}:${prize.poolPosition}`,
    )).toEqual([
      "winners:15",
      "winners:16",
      "winners:17",
      "winners:18",
      "winners:19",
      "winners:20",
      "winners:21",
      "runners-up:7",
      "runners-up:8",
      "runners-up:9",
    ]);
    expect(OCTOBER_CLAN_PRIZES.filter((prize) => prize.pool === "runners-up").map(
      (prize) => `${prize.poolPosition}:${prize.name}:${prize.approximateValue}`,
    )).toEqual([
      "1:Doll of the Dead:700 ₽",
      "2:Steam Gift Card на 500 ₽:500 ₽",
      "3:Mantle of the Cinder Baron:300 ₽",
      "4:Golden Bloodfeather Feast:200 ₽",
      "5:Steam Gift Card на 100 ₽:100 ₽",
      "6:Steam Gift Card на 100 ₽:100 ₽",
      "7:Steam Gift Card на 100 ₽:100 ₽",
      "8:Steam Gift Card на 100 ₽:100 ₽",
      "9:Golden Deepshock Destroyer:100 ₽",
    ]);
    expect(existsSync(new URL(
      "../../../../public/compendium/october/steam-gift-card-100-rub.png",
      import.meta.url,
    ))).toBe(true);
    expect(existsSync(new URL(
      "../../../../public/compendium/october/golden-bloodfeather-feast.png",
      import.meta.url,
    ))).toBe(true);
    expect(existsSync(new URL(
      "../../../../public/compendium/october/golden-deepshock-destroyer.png",
      import.meta.url,
    ))).toBe(true);
    expect(existsSync(new URL(
      "../../../../public/compendium/october/doll-of-the-dead.png",
      import.meta.url,
    ))).toBe(true);
    expect(existsSync(new URL(
      "../../../../public/compendium/october/mantle-of-the-cinder-baron.png",
      import.meta.url,
    ))).toBe(true);
    expect(html).toContain('aria-label="Малые призовые слоты кланового зачёта"');
    expect(html.match(/data-prize-row="small"/g)).toHaveLength(10);
    expect(html).toContain("30 предметов в финальном розыгрыше");
    expect(html).toContain("Победители разыграют 21 предмет, проигравшие – 9");
  });

  it("adds the requested second-place winner prize and separates both pools", () => {
    const winnerPrize = OCTOBER_CLAN_PRIZES.find(
      (prize) => prize.pool === "winners" && prize.poolPosition === 2,
    );
    const html = renderToStaticMarkup(<OctoberClanPrizeBoard />);

    expect(winnerPrize).toMatchObject({
      name: "Auspicious Scythe of Vyse",
      approximateValue: "1 100 ₽",
      imagePath: "/compendium/october/auspicious-scythe-of-vyse.png",
    });
    expect(html.match(/october-clan-prize-slot--pool-start/g)).toHaveLength(3);
    expect(html).toContain("Каждая звезда – дополнительный шанс на выигрыш");
  });

  it("uses a prepared preview for every additional prize", () => {
    for (const prize of OCTOBER_CLAN_ADDITIONAL_PRIZES.filter((prize) => prize.name)) {
      expect(prize.imagePath).toBeTruthy();
      expect(existsSync(new URL(`../../../../public${prize.imagePath}`, import.meta.url)))
        .toBe(true);
    }
  });

  it("uses transparent full previews for places 3, 4, 5 and 9", () => {
    const transparentPreviewPlaces = [3, 4, 5, 9];
    const prizes = OCTOBER_CLAN_PRIZES.filter(
      (prize) => prize.pool === "winners"
        && transparentPreviewPlaces.includes(prize.poolPosition),
    );

    expect(prizes).toHaveLength(4);
    for (const prize of prizes) {
      const png = readFileSync(new URL(
        `../../../../public${prize.imagePath}`,
        import.meta.url,
      ));
      expect([4, 6]).toContain(png[25]);
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
        thumbnail: "/compendium/october/almond-the-frondillo-thumbnail.png",
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

  it("shows every place number inside the same contrasting badge", () => {
    const html = renderToStaticMarkup(<OctoberClanPrizeBoard />);
    const styles = readFileSync(
      new URL("../../../styles/67-october-clan-standings.css", import.meta.url),
      "utf8",
    );

    expect(html.match(/class="october-clan-prize-place"/g)).toHaveLength(30);
    expect(styles).toMatch(
      /\.october-clan-prize-place\s*\{[\s\S]*?border-radius:\s*50%;[^}]*background:/,
    );
  });
});
