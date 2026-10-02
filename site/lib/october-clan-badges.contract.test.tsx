import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberClanBadge } from "@/app/components/october-clan-badges/OctoberClanBadge";
import { OctoberClanBadgeContext } from "@/app/components/october-clan-badges/OctoberClanBadgesProvider";
import {
  OCTOBER_CLAN_BADGE_TEST_ASSIGNMENTS,
  octoberClanBadgeDirectoryMode,
} from "./october-clan-badge-directory";

describe("temporary October clan badges", () => {
  it("switches test badges to assigned clans and removes them after the event", () => {
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-01T20:59:59.999Z")))
      .toBe("hidden");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-01T21:00:00.000Z")))
      .toBe("test");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-04T20:59:59.999Z")))
      .toBe("test");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-04T21:00:00.000Z")))
      .toBe("assigned");
    expect(octoberClanBadgeDirectoryMode(new Date("2026-10-25T21:00:00.000Z")))
      .toBe("hidden");
    expect(OCTOBER_CLAN_BADGE_TEST_ASSIGNMENTS).toEqual({
      "170929900": "panacea",
      "301109815": "morbus",
    });
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
  });
});
