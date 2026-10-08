import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ effect: vi.fn(), reload: vi.fn() }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: actions.effect,
}));
vi.mock("../services/reward-refresh", () => ({ reloadOctoberCompendiumAfterReward: actions.reload }));
import { OctoberDailyCountdown } from "./OctoberDailyCountdown";
import { OctoberDailyPreview } from "../sections/OctoberActivityPreview";
import { octoberDailyQuestSamples } from "../model/preview";
import { dailyResetCountdownLabel } from "@/app/compendium/model/countdown";
import { currentMoscowDay } from "@/app/compendium/model/time";
import { serverTimeFromAnchor } from "@/lib/server-clock";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("shared October daily countdown", () => {
  it.each(["2026-10-08T20:59:59Z", "2026-10-08T21:00:00Z"])("reloads the daily tasks only at midnight: %s", (now) => {
    OctoberDailyCountdown({ serverNow: "2026-10-08T12:00:00Z", currentTimeMs: Date.parse(now) });
    const [effect] = actions.effect.mock.calls[0];
    effect();
    expect(actions.reload).toHaveBeenCalledTimes(now.endsWith("21:00:00Z") ? 1 : 0);
  });

  it("counts down to Moscow midnight despite an incorrect participant clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2040-01-01T10:00:00Z"));
    const serverNow = "2026-10-08T20:59:55Z";
    const currentTimeMs = serverTimeFromAnchor(serverNow, 1000, 3000);
    const html = renderToStaticMarkup(
      <OctoberDailyCountdown serverNow={serverNow} currentTimeMs={currentTimeMs} />,
    );
    expect(html).toContain("00:00:03");
    expect(html).toContain("Испытания 1, 2, 3 и Рун обновляются ежедневно в 00:00 МСК");
    expect(html).toContain("00:00 МСК");
  });

  it.each([
    ["2026-10-08T21:00:00Z", "24:00:00"],
    ["2026-10-31T20:59:59Z", "00:00:01"],
  ])("uses Moscow day boundaries at %s", (serverNow, expected) => {
    const resetAt = currentMoscowDay(new Date(serverNow)).end.toISOString();
    expect(dailyResetCountdownLabel(resetAt, Date.parse(serverNow))).toBe(expected);
    expect(dailyResetCountdownLabel(resetAt, Date.parse(resetAt) + 1000)).toBe("00:00:00");
  });

  it("renders one timer above the cards and clarifies the daily rune limit", () => {
    const quests = octoberDailyQuestSamples();
    const completedAt = "2026-10-08T12:00:00Z";
    const html = renderToStaticMarkup(
      <OctoberDailyPreview viewerDiscordId="test" serverNow={completedAt} initialData={{
        quests, rerollsRemaining: 0, clanOuting: null,
        runeChallenge: {
          hasAccess: true, accessRoleName: null,
          selection: {
            hero: quests[0].heroes[0], selectedAt: completedAt,
            nextChangeAt: "2026-10-15T12:00:00Z", canChangeHero: false,
          },
          completion: { matchedHeroId: quests[0].heroes[0].id, matchedMatchId: "123", completedAt, isManual: false },
        },
      }} />,
    );
    expect(html.match(/compendium-section-countdown/g)).toHaveLength(1);
    expect(html.indexOf("До обновления испытаний")).toBeLessThan(html.indexOf("Испытание 1"));
    expect(html).not.toContain("compendium-rune-reset-countdown");
    expect(html).toContain("Герой выбирается на неделю (7 дней)");
    expect(html).toContain("Выполнение доступно ежедневно и обновляется вместе с другими испытаниями раз в день в 00:00 МСК");
    expect(html).not.toContain("КАЖДЫЙ ДЕНЬ");
    expect(html).toContain("09:00:00");
  });
});
