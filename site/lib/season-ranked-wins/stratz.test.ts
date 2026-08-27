import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStratzRankedMatches, stratzMatchesFromPayload } from "./stratz";

describe("Stratz season ranked wins", () => {
  it("uses the exact position and victory reported for the requested player", () => {
    const matches = stratzMatchesFromPayload(
      {
        data: {
          player: {
            matches: [
              {
                id: 100,
                lobbyType: "RANKED",
                startDateTime: 1_700_000_000,
                players: [
                  {
                    steamAccountId: 20,
                    position: "POSITION_4",
                    isVictory: true,
                  },
                ],
              },
              {
                id: 101,
                lobbyType: 0,
                startDateTime: 1_700_000_000,
                players: [
                  {
                    steamAccountId: 20,
                    position: "POSITION_1",
                    isVictory: true,
                  },
                ],
              },
            ],
          },
        },
      },
      "20",
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      matchId: "100",
      role: 4,
      won: true,
    });
  });

  it("accepts numeric Stratz positions", () => {
    const matches = stratzMatchesFromPayload(
      {
        data: {
          player: {
            matches: [
              {
                id: 102,
                lobbyType: 7,
                startDateTime: 1_700_000_000,
                players: [
                  { steamAccountId: "20", position: 5, isVictory: false },
                ],
              },
            ],
          },
        },
      },
      "20",
    );

    expect(matches[0]).toMatchObject({ role: 5, won: false });
  });

  it("accepts a complete empty match history with an empty errors list", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [], data: { player: { matches: [] } } }),
        { status: 200 },
      ),
    );

    await expect(fetchStratzRankedMatches("20")).resolves.toEqual([]);
  });

  it("rejects a response that omits the player's match list", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { player: null } }), { status: 200 }),
    );

    await expect(fetchStratzRankedMatches("20")).rejects.toThrow(
      "incomplete player response",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});
