import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));

import {
  RANKED_WIN_WARNING_MESSAGE,
  queueOrganizerRankedWinWarning,
} from "./warning-service";

const target = { roundId: 3, playerId: "100" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((callback) => callback({ query: mocks.query }));
});

describe("manual ranked win warning", () => {
  it("uses the requested neutral message without win counts", () => {
    expect(RANKED_WIN_WARNING_MESSAGE).toBe(
      "Возможно, у вас может не хватать наигранных рейтинговых матчей для участия "
      + "в будущем туре. Обязательно убедитесь в их наличии.\n\n"
      + "Сообщение могло быть отправлено ошибочно, если у вас достаточно рейтинговых "
      + "побед для участия – проигнорируйте это сообщение.",
    );
    expect(RANKED_WIN_WARNING_MESSAGE).not.toMatch(/\b(?:10|4)\b/);
  });

  it("queues one Discord warning and records the organizer", async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ tournament_id: 9 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "77" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await expect(queueOrganizerRankedWinWarning(target, "999"))
      .resolves.toEqual({ ok: true, alreadySent: false });
    expect(mocks.query.mock.calls[1][0]).toContain("INSERT INTO notification_outbox");
    expect(mocks.query.mock.calls[1][1]).toEqual([
      "100",
      3,
      "season_ranked_wins_manual_warning",
      "Внимание!",
      RANKED_WIN_WARNING_MESSAGE,
    ]);
    expect(mocks.query.mock.calls[2][1]).toEqual([
      9,
      "999",
      "100",
      expect.stringContaining('"roundId":3'),
    ]);
  });

  it("does not add a duplicate warning for the same player and round", async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ tournament_id: 9 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(queueOrganizerRankedWinWarning(target, "999"))
      .resolves.toEqual({ ok: true, alreadySent: true });
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("rejects players who are not registered for a future regular round", async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(queueOrganizerRankedWinWarning(target, "999"))
      .rejects.toMatchObject({ status: 404 });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
