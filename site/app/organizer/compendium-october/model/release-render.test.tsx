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
    expect(html.match(/Задание появится 5 октября в 00:00/g)).toHaveLength(4);
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
    expect(source).not.toContain("В вашем профиле нет подходящей руны");
  });

  it("resets the reservation preview when the organizer changes the tournament phase", () => {
    const source = readFileSync(
      new URL("../sections/OctoberClanShowcase.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('key={reservation.phase}');
  });
});
