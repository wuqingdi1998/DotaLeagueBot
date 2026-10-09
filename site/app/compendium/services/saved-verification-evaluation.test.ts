import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ matches: vi.fn(), details: vi.fn() }));
vi.mock("./opendota", () => ({ fetchRecentPlayerMatches: mocks.matches }));
vi.mock("./opendota-match-details", () => ({ fetchOpenDotaMatchDetails: mocks.details }));
import { evaluateSavedVerification } from "./saved-verification-evaluation";
import type { VerificationSnapshot } from "../model/verification-retries";

const snapshot: VerificationSnapshot = { kind: "daily", dateKey: "2026-10-11", questId: "10", title: "Испытание 1",
  dotaId: "100", rewardStars: 2, startsAt: "2026-10-11T00:00:00+03:00", endsAt: "2026-10-12T00:00:00+03:00",
  heroIds: [7], clanMates: [], requirement: null };
const now = new Date("2026-10-12T01:00:00+03:00");
function match(end: string, hero = 7, damage = 8000, id = 9001) {
  return { match_id: id, account_id: 100, hero_id: hero, player_slot: 0, radiant_win: true,
    duration: 1800, start_time: Date.parse(end) / 1000 - 1800, lobby_type: 7, game_mode: 22, tower_damage: damage };
}
beforeEach(() => vi.clearAllMocks());
it("retrieves yesterday's history and accepts only the original heroes and completion date", async () => {
  mocks.matches.mockResolvedValue([match("2026-10-12T00:01:00+03:00"), match("2026-10-11T23:00:00+03:00", 2), match("2026-10-11T23:59:00+03:00")]);
  const result = await evaluateSavedVerification(snapshot, now);
  expect(result.wins).toHaveLength(1);
  expect(result.wins[0].heroId).toBe(7);
  expect(result.wins[0].endedAt.toISOString()).toBe("2026-10-11T20:59:00.000Z");
  expect(mocks.matches).toHaveBeenCalledWith("100", { forceRefresh: true, historyDays: 2 });
});
it("does not use a Monday match to close Sunday's task", async () => {
  mocks.matches.mockResolvedValue([match("2026-10-12T00:01:00+03:00")]);
  await expect(evaluateSavedVerification(snapshot, now)).rejects.toMatchObject({ code: "NO_MATCH" });
});
it("keeps every contributing match for cumulative statistics", async () => {
  mocks.matches.mockResolvedValue([match("2026-10-11T21:00:00+03:00", 7, 8000, 9001), match("2026-10-11T22:00:00+03:00", 2, 8500, 9002)]);
  expect((await evaluateSavedVerification({ ...snapshot, kind: "star_race", requirement: { kind: "winning-building-damage", targetDamage: 15000 } }, now)).wins.map((win) => win.matchId))
    .toEqual(["9001", "9002"]);
});
it("keeps waiting when statistics are missing rather than awarding from incomplete data", async () => {
  mocks.matches.mockResolvedValue([{ ...match("2026-10-11T22:00:00+03:00"), tower_damage: null }]);
  await expect(evaluateSavedVerification({ ...snapshot, kind: "star_race", requirement: { kind: "winning-building-damage", targetDamage: 15000 } }, now))
    .rejects.toMatchObject({ code: "OPEN_DOTA_UNAVAILABLE" });
});
it("requires a teammate from the original clan on the same side", async () => {
  mocks.matches.mockResolvedValue([match("2026-10-11T22:00:00+03:00")]);
  mocks.details.mockResolvedValue({ players: [{ accountId: "100", playerSlot: 0 }, { accountId: "200", playerSlot: 128 }] });
  const outing = { ...snapshot, kind: "clan_outing" as const, clanMates: [{ dotaId: "200", playerId: "222" }] };
  await expect(evaluateSavedVerification(outing, now)).rejects.toMatchObject({ code: "NO_MATCH" });
  mocks.details.mockResolvedValue({ players: [{ accountId: "100", playerSlot: 0 }, { accountId: "200", playerSlot: 1 }] });
  expect((await evaluateSavedVerification(outing, now)).partnerPlayerId).toBe("222");
});
