import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStratzReplayUrl } from "./stratz-replay";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.STRATZ_TOKEN;
});

describe("STRATZ replay metadata", () => {
  it("builds a Valve replay URL", async () => {
    process.env.STRATZ_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { match: { clusterId: 123, replaySalt: "456" } },
    }), { status: 200 })));

    await expect(fetchStratzReplayUrl("8946503036")).resolves.toBe(
      "http://replay123.valve.net/570/8946503036_456.dem.bz2",
    );
  });

  it("does not call STRATZ without a token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStratzReplayUrl("8946503036")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
