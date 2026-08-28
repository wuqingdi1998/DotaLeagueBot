import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDraftPlayerStatistics } from "./player-statistics";

describe("Fearless Draft player statistics service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the six statistics already calculated for the public profile", async () => {
    const statistics = {
      tournaments: 7,
      tournamentWins: 1,
      podiums: 5,
      maps: 72,
      mapWins: 34,
      winRate: 47,
    };
    const request = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ profile: { statistics } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", request);

    await expect(loadDraftPlayerStatistics("90420279")).resolves.toEqual(
      statistics,
    );
    expect(request).toHaveBeenCalledWith(
      "/api/players/90420279",
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("reports an unavailable profile instead of showing invented zeroes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "Игрок не найден" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    )));

    await expect(loadDraftPlayerStatistics("0")).rejects.toThrow(
      "Не удалось загрузить статистику игрока",
    );
  });
});
