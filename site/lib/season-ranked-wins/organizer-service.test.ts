import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ one: vi.fn(), transaction: vi.fn(), query: vi.fn(), target: vi.fn(), save: vi.fn(), stratz: vi.fn(), dotabuff: vi.fn() }));
vi.mock("@/lib/db", () => ({ one: mocks.one, transaction: mocks.transaction }));
vi.mock("./repository", () => ({ playerWinTarget: mocks.target, savePlayerRankedWins: mocks.save }));
vi.mock("./service", () => ({ calculateSeasonRankedWins: mocks.stratz, SeasonRankedWinsError: class extends Error {} }));
vi.mock("./dotabuff-month", () => ({ fetchDotaBuffMonthlyRankedMatches: mocks.dotabuff }));

import { updateOrganizerRankedWins } from "./organizer-service";

const input = { roundId: 1, playerId: "100", positions: "1/5", source: "manual" as const, primaryWins: 14, secondaryWins: 0 };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.one.mockResolvedValue({ player_id: "100" });
  mocks.target.mockResolvedValue({ dota_id: "200", positions: "1/5" });
  mocks.transaction.mockImplementation((callback) => callback({ query: mocks.query }));
  mocks.query.mockResolvedValue({ rowCount: 1, rows: [{ tournament_id: 9 }] });
  mocks.save.mockResolvedValue(true);
});

describe("organizer win changes", () => {
  it("saves both manual slots atomically with an organizer audit record", async () => {
    expect(await updateOrganizerRankedWins(input, "999")).toMatchObject({ ok: true, rankedWins: { primaryRole: 1, secondaryRole: 5, primaryWins: 14, secondaryWins: 0 } });
    expect(mocks.save).toHaveBeenCalledWith("100", expect.objectContaining({ primaryWins: 14, secondaryWins: 0 }),
      expect.objectContaining({ source: "manual", isOrganizer: true, execute: expect.any(Function) }));
    expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining("tournament_audit_log"),
      [9, "999", "100", expect.stringContaining('"source":"manual"')]);
    expect(mocks.stratz).not.toHaveBeenCalled();
    expect(mocks.dotabuff).not.toHaveBeenCalled();
  });
  it("forces a fresh Stratz lookup", async () => {
    mocks.stratz.mockResolvedValue({ primaryWins: 15, secondaryWins: 4 });
    await updateOrganizerRankedWins({ ...input, source: "stratz" }, "999");
    expect(mocks.stratz).toHaveBeenCalledWith({ dotaId: "200", positions: "1/5", now: expect.any(Date) });
    expect(mocks.save).toHaveBeenCalledWith("100", { primaryWins: 15, secondaryWins: 4 }, expect.objectContaining({ source: "stratz", isOrganizer: true }));
  });
  it("calculates Dotabuff independently of Stratz", async () => {
    mocks.dotabuff.mockResolvedValue([{ matchId: "10", startedAt: new Date(Date.now() - 10000), won: true, role: 5 }]);
    expect(await updateOrganizerRankedWins({ ...input, source: "dotabuff" }, "999"))
      .toMatchObject({ rankedWins: { primaryWins: 0, secondaryWins: 1 } });
    expect(mocks.stratz).not.toHaveBeenCalled();
  });
  it("does not alter stored values on provider failure", async () => {
    mocks.dotabuff.mockRejectedValue(new Error("403"));
    await expect(updateOrganizerRankedWins({ ...input, source: "dotabuff" }, "999")).rejects.toThrow("Прежние значения сохранены");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects a removed registration before contacting providers", async () => {
    mocks.one.mockResolvedValue(null);
    await expect(updateOrganizerRankedWins({ ...input, source: "stratz" }, "999")).rejects.toMatchObject({ status: 404 });
    expect(mocks.stratz).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects a changed role selection", async () => {
    mocks.target.mockResolvedValue({ dota_id: "200", positions: "2/3" });
    await expect(updateOrganizerRankedWins(input, "999")).rejects.toMatchObject({ status: 409 });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects a concurrent newer update", async () => {
    mocks.save.mockResolvedValue(false);
    await expect(updateOrganizerRankedWins(input, "999")).rejects.toMatchObject({ status: 409 });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
