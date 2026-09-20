import { describe, expect, it, vi } from "vitest";
import {
  STRATZ_CHECK_INTERVAL_MS,
  checkStratzWithRetries,
} from "../../app/tournaments/[slug]/services/ranked-win-retry";

function snapshot(primaryWins: number, secondaryWins: number) {
  return {
    primaryRole: 1 as const,
    secondaryRole: 5 as const,
    primaryWins,
    secondaryWins,
    checkedAt: "2026-09-20T10:00:00.000Z",
    availableUntil: "2026-09-20T10:05:00.000Z",
  };
}

describe("STRATZ repeated checks", () => {
  it("runs five checks three seconds apart and keeps each role maximum", async () => {
    const check = vi.fn()
      .mockResolvedValueOnce(snapshot(9, 4))
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce(snapshot(11, 3))
      .mockResolvedValueOnce(snapshot(10, 5))
      .mockResolvedValueOnce(snapshot(8, 2));
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(checkStratzWithRetries({ check, wait })).resolves.toMatchObject({
      primaryWins: 11,
      secondaryWins: 5,
    });
    expect(check).toHaveBeenCalledTimes(5);
    expect(wait).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledWith(STRATZ_CHECK_INTERVAL_MS);
  });

  it("reports the final error when every check fails", async () => {
    const check = vi.fn().mockRejectedValue(new Error("STRATZ недоступен"));
    await expect(checkStratzWithRetries({
      check,
      wait: async () => undefined,
    })).rejects.toThrow("STRATZ недоступен");
    expect(check).toHaveBeenCalledTimes(5);
  });
});
