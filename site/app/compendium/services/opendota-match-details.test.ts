import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchOpenDotaMatchDetails,
  hasPlayerEquippedArcana,
  requestOpenDotaMatchParse,
} from "./opendota-match-details";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENDOTA_API_KEY;
});

describe("OpenDota parsed match client", () => {
  it("recognizes an Arcana assigned to the checked player", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      match_id: 8946503036,
      od_data: { has_parsed: true },
      players: [
        {
          account_id: 301109815,
          player_slot: 0,
          hero_id: 1,
          cosmetics: [{
            item_id: 123,
            item_name: "Arcana",
            item_rarity: "arcana",
            item_type_name: "Arcana",
          }],
        },
      ],
    }), { status: 200 })));

    const match = await fetchOpenDotaMatchDetails("8946503036");

    expect(match.hasParsed).toBe(true);
    expect(hasPlayerEquippedArcana(match, "301109815")).toBe(true);
  });

  it("submits an unparsed match and returns its job ID", async () => {
    process.env.OPENDOTA_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      job: { jobId: "parse-job-1" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestOpenDotaMatchParse("8946503036")).resolves.toBe(
      "parse-job-1",
    );
    const [requestUrl, options] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toContain("/api/request/8946503036");
    expect(String(requestUrl)).toContain("api_key=test-key");
    expect(options).toMatchObject({ method: "POST" });
  });
});
