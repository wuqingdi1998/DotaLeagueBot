import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  one: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  one: mocks.one,
  transaction: mocks.transaction,
}));

import {
  saveFinalPredictionPick,
  saveFinalPredictionTeams,
} from "./star-race-final-prediction-repository";

describe("final prediction opening repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback({ query }));
  });

  it("opens on the first team save and queues Discord messages for active players with stars", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT winner_position")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO notification_outbox")) {
        return { rows: [], rowCount: 7 };
      }
      return { rows: [], rowCount: 1 };
    });

    const now = new Date("2026-08-21T19:15:00.000Z");
    await expect(saveFinalPredictionTeams({
      teams: ["A", "B", "C", "D", "E", "F"],
      administratorId: "100",
      notificationTitle: "Открылся финальный прогноз",
      notificationMessage: "Выберите победителя до 05:00 МСК.",
      actionUrl: "https://lsesports.ru/compendium",
      now,
    })).resolves.toEqual({ isOpened: true, notifiedPlayers: 7 });

    const insert = query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO compendium_star_race_final_predictions")
    );
    expect(insert?.[1]).toContain(now);
    const notification = query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO notification_outbox")
    );
    expect(notification?.[0]).toContain("star_total.total_stars > 0");
    expect(notification?.[0]).toContain("player.is_archived = FALSE");
    expect(notification?.[1]).toContain("https://lsesports.ru/compendium");
  });

  it("updates teams without sending the opening notification twice", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT winner_position")) {
        return {
          rows: [{ winner_position: null, opened_at: new Date("2026-08-21T18:00:00Z") }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(saveFinalPredictionTeams({
      teams: ["A", "B", "C", "D", "E", "F"],
      administratorId: "100",
      notificationTitle: "Открылся финальный прогноз",
      notificationMessage: "Выберите победителя до 05:00 МСК.",
      actionUrl: "https://lsesports.ru/compendium",
      now: new Date("2026-08-21T20:00:00Z"),
    })).resolves.toEqual({ isOpened: false, notifiedPlayers: 0 });
    expect(query.mock.calls.some(([sql]) =>
      String(sql).includes("INSERT INTO notification_outbox")
    )).toBe(false);
  });

  it("does not accept a player pick before the saved opening moment", async () => {
    query.mockResolvedValueOnce({
      rows: [{ winner_position: null, opened_at: new Date("2026-08-21T20:00:00Z") }],
      rowCount: 1,
    });

    await expect(saveFinalPredictionPick({
      playerId: "100",
      position: 2,
      closesAt: new Date("2026-08-22T02:00:00Z"),
      now: new Date("2026-08-21T19:59:59Z"),
    })).rejects.toThrow("PREDICTION_NOT_OPEN");
  });
});
