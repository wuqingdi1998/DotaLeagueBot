import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";

const mocks = vi.hoisted(() => ({
  hasActiveSeries: vi.fn(),
  lockDraftPlayers: vi.fn(),
}));

vi.mock("@/app/fearless-draft/server/database", () => mocks);

import { createSeasonLobbyDraft } from "./captain-draft";

function existingDraftClient(captains: [string, string]) {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes("FROM draft_series WHERE season_match_id")) {
        return {
          rows: [{
            id: 55,
            player1_id: captains[0],
            player2_id: captains[1],
            status: "CHOOSING",
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    }),
  } as unknown as PoolClient;
  return { client, queries };
}

describe("season lobby Fearless Draft creation", () => {
  beforeEach(() => {
    mocks.hasActiveSeries.mockReset();
    mocks.lockDraftPlayers.mockReset();
  });

  it("reuses the same match draft instead of reporting a false conflict", async () => {
    const { client, queries } = existingDraftClient(["10001", "10006"]);

    await createSeasonLobbyDraft(client, 10, 2, {
      teamA: "10001",
      teamB: "10006",
    });

    expect(mocks.hasActiveSeries).not.toHaveBeenCalled();
    expect(queries.some((sql) => sql.includes("SET status = 'drafting'"))).toBe(true);
    expect(queries.some((sql) => sql.includes("INSERT INTO draft_series"))).toBe(false);
  });

  it("does not silently reuse a current-match draft with different captains", async () => {
    const { client } = existingDraftClient(["10002", "10007"]);

    await expect(createSeasonLobbyDraft(client, 10, 2, {
      teamA: "10001",
      teamB: "10006",
    })).rejects.toThrow("с другими капитанами");
  });
});
