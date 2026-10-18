import type { PoolClient } from "pg";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), transaction: mocks.transaction }));

import { ensurePersonalDailyQuests } from "./personal-quest-generation";
import { recordDailyQuestReroll } from "./reroll-repository";

const days = [
  ["2026-10-21", [1, 2, 74, 104, 12, 21, 5, 50, 31, 26, 14, 30]],
  ["2026-10-23", [43, 72, 52, 129, 108, 63, 66, 103, 58, 155, 45, 79]],
] as const;

function generationClient() {
  const heroIds: number[] = [];
  const positions: number[] = [];
  let sequence = 500;
  const client = { query: vi.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes("SELECT discord_id::text AS player_id")) return { rows: [{ player_id: "100" }] };
    if (sql.includes("SELECT quest.quest_set_id::text")) return { rows: [{ quest_set_id: "500", hero_count: 6 }], rowCount: 1 };
    if (sql.includes("AS total_points")) return { rows: [{ total_points: 0, used_count: 0 }] };
    if (sql.includes("INSERT INTO compendium_daily_quests")) {
      positions.push(Number(values[2]));
      return { rows: [{ id: String(++sequence) }], rowCount: 1 };
    }
    if (sql.includes("INSERT INTO compendium_daily_quest_heroes")) heroIds.push(...values[2] as number[]);
    else if (sql.includes("INSERT INTO compendium_user_quest_rerolls")) return { rows: [{ id: "900" }] };
    else if (sql.includes("INSERT INTO compendium_user_quest_reroll_heroes")) heroIds.push(Number(values[1]));
    else if (!sql.trimStart().startsWith("SELECT")) throw new Error(`Unexpected mutation: ${sql}`);
    return { rows: [], rowCount: 0 };
  }) } as unknown as PoolClient;
  return { client, heroIds, positions };
}

afterEach(() => vi.restoreAllMocks());

it.each(days)("excludes both race pools from initial trials 1 and 2 on %s", async (date, reserved) => {
  for (const seed of [0, 0.1, 0.42, 0.9]) {
    const generated = generationClient();
    await ensurePersonalDailyQuests(generated.client, "500", date, "100", () => seed);
    expect(generated.positions).toEqual([1, 2]);
    expect(generated.heroIds).toHaveLength(12);
    expect(new Set(generated.heroIds).size).toBe(12);
    expect(generated.heroIds.filter((id) => (reserved as readonly number[]).includes(id))).toEqual([]);
  }
});

it.each(days)("excludes both race pools from trial rerolls on %s", async (date, reserved) => {
  const random = vi.spyOn(Math, "random");
  for (const seed of [0, 0.1, 0.42, 0.9]) {
    random.mockReturnValue(seed);
    const generated = generationClient();
    mocks.transaction.mockImplementation((callback: (client: PoolClient) => Promise<void>) => callback(generated.client));
    await recordDailyQuestReroll({ playerId: "100", questId: "501", dateKey: date });
    expect(generated.heroIds).toHaveLength(6);
    expect(generated.heroIds.filter((id) => (reserved as readonly number[]).includes(id))).toEqual([]);
  }
});
