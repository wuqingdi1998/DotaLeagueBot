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
      .resolves.toEqual({ ok: true });
    expect(mocks.query.mock.calls[1][0]).toContain("INSERT INTO notification_outbox");
    expect(mocks.query.mock.calls[1][1]).toEqual([
      "100",
      3,
      expect.stringMatching(
        /^season_ranked_wins_manual_warning:[0-9a-f-]{36}$/,
      ),
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

  it("queues a new warning after every organizer click", async () => {
    mocks.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ tournament_id: 9 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "77" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ tournament_id: 9 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "78" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await expect(queueOrganizerRankedWinWarning(target, "999"))
      .resolves.toEqual({ ok: true });
    await expect(queueOrganizerRankedWinWarning(target, "999"))
      .resolves.toEqual({ ok: true });

    const firstEventType = mocks.query.mock.calls[1][1][2];
    const secondEventType = mocks.query.mock.calls[4][1][2];
    expect(firstEventType).not.toBe(secondEventType);
    expect(mocks.query.mock.calls[1][0]).not.toContain("ON CONFLICT");
    expect(mocks.query.mock.calls[4][0]).not.toContain("ON CONFLICT");
    expect(mocks.query).toHaveBeenCalledTimes(6);
  });

  it("rejects players who are not registered for a future regular round", async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(queueOrganizerRankedWinWarning(target, "999"))
      .rejects.toMatchObject({ status: 404 });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
