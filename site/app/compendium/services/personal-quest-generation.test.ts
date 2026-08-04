import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { ensurePersonalDailyQuests } from "./personal-quest-generation";

describe("personal daily quest generation", () => {
  it("preserves completed cards and independently replaces unfinished cards", async () => {
    const questInserts: Array<{ id: string; values: unknown[] }> = [];
    const heroInserts: Array<{ questId: string; heroIds: number[] }> = [];
    const completionMoves: unknown[][] = [];
    let questSequence = 900;
    const client = {
      query: vi.fn(async (sql: string, values: unknown[]) => {
        if (sql.includes("SELECT discord_id::text AS player_id")) {
          return { rows: [{ player_id: "100" }, { player_id: "101" }] };
        }
        if (sql.includes("SELECT quest.player_id::text")) {
          return { rows: [] };
        }
        if (sql.includes("SELECT completion.id::text AS completion_id")) {
          return {
            rows: [1, 2, 3, 4, 5, 6].map((heroId, index) => ({
              completion_id: "700",
              player_id: "100",
              position: 3,
              hero_id: heroId,
              hero_position: index + 1,
            })),
          };
        }
        if (sql.includes("SELECT selection.player_id::text")) {
          return { rows: [{ player_id: "100", hero_id: 7 }] };
        }
        if (sql.includes("INSERT INTO compendium_daily_quests")) {
          questSequence += 1;
          const id = String(questSequence);
          questInserts.push({ id, values });
          return { rows: [{ id }], rowCount: 1 };
        }
        if (sql.includes("INSERT INTO compendium_daily_quest_heroes")) {
          heroInserts.push({
            questId: String(values[0]),
            heroIds: values[2] as number[],
          });
          return { rows: [], rowCount: 6 };
        }
        if (sql.includes("UPDATE compendium_user_quest_completions")) {
          completionMoves.push(values);
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`Unexpected query: ${sql}`);
      }),
    } as unknown as PoolClient;
    let randomState = 17;
    const random = () => {
      randomState = (randomState * 48271) % 2147483647;
      return randomState / 2147483647;
    };

    await ensurePersonalDailyQuests(
      client,
      "500",
      "2026-08-04",
      undefined,
      random,
    );

    expect(questInserts).toHaveLength(8);
    expect(completionMoves).toEqual([["903", "700"]]);
    expect(heroInserts.find(({ questId }) => questId === "903")?.heroIds).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);

    const regularHeroesByPlayer = new Map<string, number[]>();
    for (const quest of questInserts) {
      const playerId = String(quest.values[1]);
      const position = Number(quest.values[2]);
      if (position > 3) continue;
      const heroes = heroInserts.find(({ questId }) => questId === quest.id)?.heroIds ?? [];
      regularHeroesByPlayer.set(playerId, [
        ...(regularHeroesByPlayer.get(playerId) ?? []),
        ...heroes,
      ]);
    }
    expect(new Set(regularHeroesByPlayer.get("100")).size).toBe(18);
    expect(new Set(regularHeroesByPlayer.get("101")).size).toBe(18);
    expect(regularHeroesByPlayer.get("100")).not.toEqual(
      regularHeroesByPlayer.get("101"),
    );
    expect(regularHeroesByPlayer.get("100")).not.toContain(7);
  });
});
