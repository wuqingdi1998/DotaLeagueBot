import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRecentPlayerMatches, resetOpenDotaCacheForTests } from "./opendota";

const validMatch = {
  match_id: 42,
  player_slot: 0,
  radiant_win: true,
  duration: 1800,
  game_mode: 22,
  lobby_type: 7,
  hero_id: 1,
  start_time: 1_700_000_000,
};

afterEach(() => {
  vi.unstubAllGlobals();
  resetOpenDotaCacheForTests();
});

describe("OpenDota client", () => {
  it("uses a short cache for consecutive quest checks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([validMatch]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([
      fetchRecentPlayerMatches("301109815"),
      fetchRecentPlayerMatches("301109815"),
      fetchRecentPlayerMatches("301109815"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fetchRecentPlayerMatches("301109815");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not accept malformed match fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ ...validMatch, radiant_win: "yes" }]), { status: 200 }),
    ));
    await expect(fetchRecentPlayerMatches("301109815")).resolves.toEqual([]);
  });

  it("turns an OpenDota rate limit into a safe service error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    await expect(fetchRecentPlayerMatches("301109815")).rejects.toMatchObject({
      code: "OPEN_DOTA_UNAVAILABLE",
    });
  });

  it("does not leak the API key into returned data", async () => {
    process.env.OPENDOTA_API_KEY = "test-secret";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([validMatch]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const matches = await fetchRecentPlayerMatches("301109815");
    expect(JSON.stringify(matches)).not.toContain("test-secret");
    delete process.env.OPENDOTA_API_KEY;
  });
});
