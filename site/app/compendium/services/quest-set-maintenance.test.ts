import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { completeExistingQuestCards } from "./quest-set-maintenance";

describe("existing compendium quest cards", () => {
  it("keeps issued heroes and only appends two missing heroes", async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const client = {
      query: vi.fn(async (sql: string, values: unknown[]) => {
        statements.push({ sql, values });
        if (sql.includes("SELECT quest.id::text AS quest_id")) {
          return {
            rows: [1, 2, 3, 4].map((heroId, index) => ({
              quest_id: "101",
              hero_id: heroId,
              hero_position: index + 1,
            })),
          };
        }
        if (sql.includes("SELECT reroll.id::text AS reroll_id")) {
          return {
            rows: [5, 6, 7, 8].map((heroId, index) => ({
              reroll_id: "201",
              player_id: "301",
              hero_id: heroId,
              hero_position: index + 1,
            })),
          };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await completeExistingQuestCards(client, "401");

    const sharedInserts = statements.filter(({ sql }) =>
      sql.includes("INSERT INTO compendium_daily_quest_heroes"),
    );
    const rerollInserts = statements.filter(({ sql }) =>
      sql.includes("INSERT INTO compendium_user_quest_reroll_heroes"),
    );
    expect(sharedInserts).toHaveLength(2);
    expect(rerollInserts).toHaveLength(2);
    expect(sharedInserts.map(({ values }) => values[3])).toEqual([5, 6]);
    expect(rerollInserts.map(({ values }) => values[2])).toEqual([5, 6]);
    expect(statements.every(({ sql }) => !sql.includes("DELETE FROM"))).toBe(true);
  });
});
