import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberDailyPreview } from "../sections/OctoberActivityPreview";

describe("October public release presentation", () => {
  it("keeps the complete planned daily layout visible under four opening overlays", () => {
    const html = renderToStaticMarkup(
      <OctoberDailyPreview viewerDiscordId="viewer-1" isOpen={false} />,
    );
    expect(html.match(/class="october-daily-opening-overlay"/g)).toHaveLength(4);
    expect(html.match(/Задание появится 6 октября в 00:00/g)).toHaveLength(4);
    expect(html.match(/class="compendium-quest"/g)).toHaveLength(2);
    expect(html).toContain("compendium-heroes");
    expect(html).toContain("october-clan-quest-emblem");
    expect(html).toContain("compendium-rune-picker");
  });

  it("removes only the opening overlays after the tournament starts", () => {
    const html = renderToStaticMarkup(
      <OctoberDailyPreview viewerDiscordId="viewer-1" isOpen />,
    );
    expect(html).not.toContain("october-daily-opening-overlay");
    expect(html.match(/class="compendium-quest"/g)).toHaveLength(2);
    expect(html).toContain("compendium-heroes");
    expect(html).toContain("october-clan-quest-emblem");
    expect(html).toContain("compendium-rune-picker");
  });

  it("explains Supporters access and uses the subscription-level fallback", () => {
    const source = readFileSync(
      new URL("../components/OctoberClanReservationPanel.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("уровня «Суппортеры»");
    expect(source).toContain("У вас нет подходящего уровня подписки");
    expect(source).toContain('href="/boosty"');
    expect(source).toContain("Участники, не забронировавшие место в клане");
    expect(source).not.toContain("Руна Воды не участвует");
    expect(source).not.toContain("В вашем профиле нет подходящей руны");
  });

  it("allows only an administrator preview to reserve before public launch", () => {
    const route = readFileSync(
      new URL("../../../api/compendium/october/clan-reservation/route.ts", import.meta.url),
      "utf8",
    );
    const panel = readFileSync(
      new URL("../components/OctoberClanReservationPanel.tsx", import.meta.url),
      "utf8",
    );
    expect(route).toContain("body.organizerPreview === true && user.isAdmin");
    expect(route).toContain("allowBeforeLaunch");
    expect(panel).toContain("organizerPreview: isOrganizerPreview");
  });

  it("resets the reservation preview when the organizer changes the tournament phase", () => {
    const source = readFileSync(
      new URL("../sections/OctoberClanShowcase.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('key={reservation.phase}');
  });

  it("removes the reservation banner completely after clan publication", () => {
    const panel = readFileSync(
      new URL("../components/OctoberClanReservationPanel.tsx", import.meta.url),
      "utf8",
    );
    const showcase = readFileSync(
      new URL("../sections/OctoberClanShowcase.tsx", import.meta.url),
      "utf8",
    );
    expect(panel).not.toContain("Составы сформированы");
    expect(showcase).toContain('reservation.phase !== "published"');
  });

  it("uses the compact full-width rune challenge layout", () => {
    const html = renderToStaticMarkup(
      <OctoberDailyPreview viewerDiscordId="viewer-1" isOpen />,
    );
    const styles = readFileSync(
      new URL("../../../styles/69-october-compendium-release.css", import.meta.url),
      "utf8",
    );
    expect(html).not.toContain("Ежедневное задание для подписчиков");
    expect(html).not.toContain("compendium-spinner");
    expect(html.indexOf("Испытание Рун"))
      .toBeLessThan(html.indexOf("compendium-rune-content"));
    expect(styles).toContain("flex-direction: column;");
    expect(styles).toContain("flex: 0 0 auto;");
    expect(styles).toContain(".october-compendium-screen-daily .compendium-rune-first-selection");
  });
});
