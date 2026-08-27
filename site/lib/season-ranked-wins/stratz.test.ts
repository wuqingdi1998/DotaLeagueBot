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

  it("does not treat a GraphQL error with an empty list as zero wins", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: "rate limit" }],
          data: { player: { matches: [] } },
        }),
        { status: 200 },
      ),
    );

    await expect(fetchStratzRankedMatches("20")).rejects.toThrow(
      "Stratz did not return the first match page",
    );
  });

  it("keeps valid matches when Stratz returns them with a GraphQL warning", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: "one optional field was unavailable" }],
          data: {
            player: {
              matches: [
                {
                  id: 150,
                  lobbyType: "RANKED",
                  startDateTime: 1_787_313_600,
                  players: [
                    null,
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
        }),
        { status: 200 },
      ),
    );

    await expect(
      fetchStratzRankedMatches("20", new Date("2026-08-27T12:00:00.000Z")),
    ).resolves.toMatchObject([{ matchId: "150", role: 1, won: true }]);
  });

  it("rejects an unavailable player history so the previous snapshot is kept", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { player: null } }), { status: 200 }),
    );

    await expect(fetchStratzRankedMatches("20")).rejects.toThrow(
      "Stratz did not return the first match page",
    );
  });

  it("keeps matches from completed pages when the next Stratz page fails", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    const recentMatches = Array.from({ length: 50 }, (_, index) => ({
      id: 200 + index,
      lobbyType: index === 0 ? "RANKED" : 0,
      startDateTime: 1_787_313_600,
      players: [
        {
          steamAccountId: 20,
          position: "POSITION_3",
          isVictory: true,
        },
      ],
    }));
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { player: { matches: recentMatches } } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));

    await expect(
      fetchStratzRankedMatches("20", new Date("2026-08-27T12:00:00.000Z")),
    ).resolves.toMatchObject([{ matchId: "200", role: 3, won: true }]);
  });

  it("rejects an unavailable first page so it cannot replace wins with zero", async () => {
    vi.stubEnv("STRATZ_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unavailable", { status: 503 }),
    );

    await expect(fetchStratzRankedMatches("20")).rejects.toThrow(
      "Stratz match page 1 returned HTTP 503",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});
