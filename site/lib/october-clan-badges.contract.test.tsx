import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberClanBadge } from "@/app/components/october-clan-badges/OctoberClanBadge";
import { OctoberClanBadgeContext } from "@/app/components/october-clan-badges/OctoberClanBadgesProvider";
import {
  octoberClanBadgeDirectoryMode,
} from "./october-clan-badge-directory";

describe("temporary October clan badges", () => {
  it("uses reservations before assignment and removes badges after the event", () => {
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-01T20:59:59.999Z")))
      .toBe("hidden");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-01T21:00:00.000Z")))
      .toBe("reservation");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-04T20:59:59.999Z")))
      .toBe("reservation");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-04T21:00:00.000Z")))
      .toBe("assigned");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-25T21:00:00.000Z")))
      .toBe("hidden");
    const source = readFileSync(
      new URL("./october-clan-badge-directory.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("october_compendium_clan_reservations");
    expect(source).not.toContain("OCTOBER_CLAN_BADGE_TEST_ASSIGNMENTS");
    expect(source).not.toContain('"170929900"');
    expect(source).not.toContain('"301109815"');
  });

  it("renders the assigned clan emblem to the right of a nickname", () => {
    const html = renderToStaticMarkup(
      <OctoberClanBadgeContext.Provider
        value={{ clansByDotaId: { "123": "morbus" }, isActive: true }}
      >
        <strong>Игрок<OctoberClanBadge dotaId="123" /></strong>
      </OctoberClanBadgeContext.Provider>,
    );
    expect(html).toContain("october-clan-name-badge--morbus");
    expect(html).toContain("Клан «Морбус»");
    expect(html.indexOf("Игрок")).toBeLessThan(html.indexOf("october-clan-name-badge"));
  });

  it("keeps clan emblems readable on compact clan-colored tiles", () => {
    const styles = readFileSync(
      new URL("../app/styles/03-october-clan-badges.css", import.meta.url),
      "utf8",
    );
    const hallStyles = readFileSync(
      new URL("../app/styles/19-hall-of-fame.css", import.meta.url),
      "utf8",
    );
    const mobileStyles = readFileSync(
      new URL("../app/styles/10-public-mobile-density.css", import.meta.url),
      "utf8",
    );
    expect(styles).toMatch(
      /\.october-clan-name-badge\s*\{[^}]*width: 1\.35em;[^}]*height: 1\.35em;[^}]*flex: 0 0 1\.35em;[^}]*border-radius: 0\.35em;/,
    );
    expect(styles).toMatch(
      /\.october-clan-name-badge \.october-clan-name-badge-image \{[^}]*width: 1\.08em;[^}]*height: 1\.08em;/,
    );
    expect(styles).toContain(".october-clan-name-badge--morbus");
    expect(styles).toContain(".october-clan-name-badge--panacea");
    expect(styles).toContain(".october-clan-name-badge--profile");
    expect(hallStyles).not.toMatch(/\.hall-player img/);
    expect(hallStyles).toContain(".hall-player > img");
    expect(mobileStyles).not.toMatch(/\.hall-player img/);
    expect(mobileStyles).toContain(".hall-player > img");
  });

  it("uses the official one-month Dota Plus item image in weeks one and two", () => {
    const plan = readFileSync(
      new URL("../app/organizer/compendium-october/model/plan.ts", import.meta.url),
      "utf8",
    );
    const prizePreview = readFileSync(
      new URL("../app/compendium/components/StarRacePrizePreview.tsx", import.meta.url),
      "utf8",
    );
    expect(existsSync(new URL("../public/compendium/october/dota-plus-one-month.png", import.meta.url)))
      .toBe(true);
    expect(plan).toContain("/compendium/october/dota-plus-one-month.png");
    expect(prizePreview).toContain("createPortal");
    expect(prizePreview).toContain('placement: "above" | "below"');
    expect(prizePreview).toContain('fill');
    expect(prizePreview).not.toContain('height={436}');
  });
});
