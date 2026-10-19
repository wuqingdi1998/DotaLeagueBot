import { afterEach, expect, it, vi } from "vitest";
import type { OpenDotaMatch } from "../model/types";
const mocks = vi.hoisted(() => ({ details: vi.fn() }));
vi.mock("./opendota-match-details", () => ({ fetchOpenDotaMatchDetails: mocks.details }));
import { enrichStarRaceNetWorth, resetStarRaceNetWorthCacheForTests } from "./final-race-net-worth";

const match = (overrides: Partial<OpenDotaMatch> = {}): OpenDotaMatch => ({
  match_id: 1, account_id: "100", player_slot: 0, radiant_win: true, hero_id: 1,
  game_mode: 22, lobby_type: 7, duration: 1800, start_time: Date.parse("2026-10-24T12:00:00+03:00") / 1000, ...overrides,
});
const input = { dotaId: "100", requirement: { kind: "cumulative-net-worth" as const, target: 60_000 },
  dayStart: new Date("2026-10-24T00:00:00+03:00"), dayEnd: new Date("2026-10-25T00:00:00+03:00"), now: new Date("2026-10-24T23:00:00+03:00") };
const player = { accountId: "100", playerSlot: 0, heroId: 1, netWorth: 35_000 };
afterEach(() => { resetStarRaceNetWorthCacheForTests(); vi.resetAllMocks(); });

it("fetches exact final values only for eligible wins and caches concurrent requests", async () => {
  mocks.details.mockResolvedValue({ matchId: "1", players: [player, { ...player, accountId: "200", playerSlot: 1, netWorth: 90_000 }] });
  const matches = [match(), match({ match_id: 2, radiant_win: false }), match({ match_id: 3, game_mode: 23 }), match({ match_id: 4, net_worth: 0 })];
  const [first, second] = await Promise.all([enrichStarRaceNetWorth({ ...input, matches }), enrichStarRaceNetWorth({ ...input, matches })]);
  expect(first[0].net_worth).toBe(35_000);
  expect(second[0].net_worth).toBe(35_000);
  expect(first[3].net_worth).toBe(0);
  expect(matches[0].net_worth).toBeUndefined();
  expect(mocks.details).toHaveBeenCalledTimes(1);
});

it.each([
  { matchId: "2", players: [player] },
  { matchId: "1", players: [{ ...player, accountId: "200" }] },
  { matchId: "1", players: [{ ...player, playerSlot: 128 }] },
  { matchId: "1", players: [{ ...player, heroId: 2 }] },
])("rejects mismatched match or player details", async (details) => {
  mocks.details.mockResolvedValue(details);
  await expect(enrichStarRaceNetWorth({ ...input, matches: [match()] })).rejects.toMatchObject({ code: "OPEN_DOTA_UNAVAILABLE" });
});

it("does not cache absent statistics as zero and retrieves them on a later attempt", async () => {
  mocks.details.mockResolvedValueOnce({ matchId: "1", players: [{ accountId: "100", playerSlot: 0, heroId: 1 }] })
    .mockResolvedValueOnce({ matchId: "1", players: [player] });
  expect((await enrichStarRaceNetWorth({ ...input, matches: [match()] }))[0].net_worth).toBeNull();
  expect((await enrichStarRaceNetWorth({ ...input, matches: [match()] }))[0].net_worth).toBe(35_000);
  expect(mocks.details).toHaveBeenCalledTimes(2);
});

it("leaves every other race requirement untouched", async () => {
  const matches = [match()];
  expect(await enrichStarRaceNetWorth({ ...input, matches, requirement: { kind: "cumulative-assists", target: 35 } })).toBe(matches);
  expect(mocks.details).not.toHaveBeenCalled();
});
