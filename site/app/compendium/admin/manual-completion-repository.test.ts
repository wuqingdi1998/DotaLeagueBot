import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  transaction: (callback: (client: { query: typeof mocks.query }) => unknown) =>
    callback({ query: mocks.query }),
}));

import {
  completeDailyQuestManually,
  completeStarRaceQuestManually,
} from "./manual-completion-repository";

describe("manual challenge completion repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a daily card once without a fake hero or match", async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "500" }] });

    await expect(completeDailyQuestManually({
      playerId: "100",
      questId: "200",
      administratorId: "300",
      now: new Date("2026-08-20T12:00:00Z"),
    })).resolves.toEqual({ rewardStars: 1, wasCreated: true });

    const insert = mocks.query.mock.calls[2];
    expect(insert[0]).toContain("NULL, NULL");
    expect(insert[0]).toContain("ON CONFLICT (player_id, daily_quest_id)");
    expect(insert[1]).toEqual(["100", "200", 1, "300"]);
  });

  it("does not award a completed daily card twice", async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(completeDailyQuestManually({
      playerId: "100",
      questId: "200",
      administratorId: "300",
      now: new Date("2026-08-20T12:00:00Z"),
    })).resolves.toEqual({ rewardStars: 1, wasCreated: false });
  });

  it("records the active race challenge once", async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "600" }] });

    await expect(completeStarRaceQuestManually({
      playerId: "100",
      dateKey: "2026-08-20",
      administratorId: "300",
      now: new Date("2026-08-20T12:00:00Z"),
    })).resolves.toEqual({ rewardStars: 3, wasCreated: true });

    expect(mocks.query.mock.calls[2][0]).toContain(
      "ON CONFLICT (player_id, moscow_date)",
    );
    expect(mocks.query.mock.calls[2][1]).toEqual([
      "100",
      "2026-08-20",
      3,
      "300",
    ]);
  });
});
