import { Children, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ request: vi.fn(), reload: vi.fn() }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [initial, vi.fn()],
  useMemo: (factory: () => unknown) => factory(),
}));
vi.mock("@/lib/site-request", () => ({ fetchSiteRequest: actions.request }));
vi.mock("../services/reward-refresh", () => ({ reloadOctoberCompendiumAfterReward: actions.reload }));
vi.mock("../hooks/useOctoberGuideVisibility", () => ({
  useOctoberGuideVisibility: () => ({ isVisible: () => false, dismiss: vi.fn(), restoreAll: vi.fn() }),
}));
vi.mock("@/app/compendium/hooks/useServerClock", () => ({ useServerClock: () => 0 }));
vi.mock("@/app/compendium/hooks/useCompendiumToast", () => ({ useCompendiumToast: () => ["", vi.fn()] }));

import { OctoberDailyPreview, OctoberRacePreview } from "./OctoberActivityPreview";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import { CompendiumStarRace } from "@/app/compendium/components/CompendiumStarRace";
import { OctoberClanOutingCard } from "./OctoberClanOutingCard";
import { OCTOBER_COMPENDIUM_WEEKS } from "../model/plan";
import { octoberDailyQuestSamples, octoberRacePreviewData } from "../model/preview";

function findProps(node: ReactNode, type: unknown): Record<string, unknown> {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === type) return child.props;
    const found = findProps(child.props.children, type);
    if (Object.keys(found).length) return found;
  }
  return {};
}

const runeChallenge = { hasAccess: true, accessRoleName: null, selection: null, completion: null };
function dailyScreen() {
  return OctoberDailyPreview({ viewerDiscordId: "123", initialData: {
    quests: octoberDailyQuestSamples(), rerollsRemaining: 1, clanOuting: null, runeChallenge,
  } });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("October successful check refresh", () => {
  it.each([QuestCard, OctoberClanOutingCard])("reloads after a completed daily challenge or outing: %s", async (type) => {
    actions.request.mockResolvedValue({ ok: true, json: async () => ({ completion: { id: "done" } }) });
    const props = findProps(dailyScreen(), type);
    await (props.onCheck as (id: string) => Promise<void>)("quest");
    // The outing's UI callback deliberately does not return its promise.
    await vi.waitFor(() => expect(actions.reload).toHaveBeenCalledOnce());
  });

  it.each([false, true])("does not reload incomplete/error daily checks (HTTP success: %s)", async (ok) => {
    actions.request.mockResolvedValue({ ok, json: async () => ({ error: "Нет подходящего матча" }) });
    await (findProps(dailyScreen(), QuestCard).onCheck as (id: string) => Promise<void>)("quest");
    expect(actions.reload).not.toHaveBeenCalled();
  });

  it.each([null, { id: "done" }])("reloads race only for completion: %s", async (completion) => {
    const week = OCTOBER_COMPENDIUM_WEEKS[0];
    const race = octoberRacePreviewData(week);
    actions.request.mockResolvedValue({ ok: true, json: async () => ({ starRace: race, completion }) });
    const props = findProps(OctoberRacePreview({ week, initialRace: race }), CompendiumStarRace);
    await (props.onCheck as (id: string) => Promise<void>)(race.quests[0].dateKey);
    expect(actions.reload).toHaveBeenCalledTimes(completion ? 1 : 0);
  });

  it("passes the completed rune refresh callback without changing legacy rune consumers", () => {
    expect(findProps(dailyScreen(), RuneChallenge).onCompleted).toBe(actions.reload);
  });
});
