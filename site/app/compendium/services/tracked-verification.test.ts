import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), enqueue: vi.fn() }));
vi.mock("./verification-snapshot", () => ({ captureVerificationSnapshot: mocks.snapshot }));
vi.mock("./verification-repository", () => ({ enqueueVerification: mocks.enqueue }));
import { trackCompendiumVerification } from "./tracked-verification";
import { CompendiumError } from "../model/errors";
import type { AuthUser } from "@/lib/auth";

const user = { discordId: "100" } as AuthUser;
beforeEach(() => { vi.clearAllMocks(); mocks.snapshot.mockResolvedValue({ kind: "daily", dateKey: "2026-10-11" }); mocks.enqueue.mockResolvedValue({ status: "pending" }); });
it("persists provider errors and no-match results and tells the player about background checks", async () => {
  for (const code of ["OPEN_DOTA_UNAVAILABLE", "NO_MATCH"] as const) {
    await expect(trackCompendiumVerification(user, "daily", "10", async () => { throw new CompendiumError(code, "Failure"); }))
      .rejects.toThrow("Запрос сохранён");
  }
  expect(mocks.enqueue).toHaveBeenCalledTimes(2);
});
it("does not start retries for rate limits, missing access, or invalid requests", async () => {
  await expect(trackCompendiumVerification(user, "daily", "10", async () => { throw new CompendiumError("RATE_LIMITED", "Limit"); })).rejects.toThrow("Limit");
  expect(mocks.enqueue).not.toHaveBeenCalled();
  mocks.snapshot.mockRejectedValue(new CompendiumError("RUNE_ACCESS_REQUIRED", "No access"));
  const check = vi.fn();
  await expect(trackCompendiumVerification(user, "rune", undefined, check)).rejects.toThrow("No access");
  expect(check).not.toHaveBeenCalled();
});
it("returns a player's successful result without launching another retry", async () => {
  const result = { completion: { matchedMatchId: "9001" } };
  expect(await trackCompendiumVerification(user, "daily", "10", async () => result)).toBe(result);
  expect(mocks.enqueue).not.toHaveBeenCalled();
});
it("queues an incomplete cumulative task without discarding its visible progress", async () => {
  const result = { completion: null, progress: { current: 8000 } };
  expect(await trackCompendiumVerification(user, "star_race", "2026-10-11", async () => result)).toBe(result);
  expect(mocks.enqueue).toHaveBeenCalledTimes(1);
});
it("does not promise more automatic checks after the request is exhausted", async () => {
  mocks.enqueue.mockResolvedValue({ status: "exhausted" });
  await expect(trackCompendiumVerification(user, "daily", "10", async () => { throw new CompendiumError("NO_MATCH", "No match"); })).rejects.toThrow(/^No match$/);
});
it("retains a request that was valid before midnight even if the final event ends while OpenDota responds", async () => {
  await expect(trackCompendiumVerification(user, "daily", "10", async () => { throw new CompendiumError("COMPENDIUM_FINISHED", "Event ended"); }))
    .rejects.toThrow("Запрос сохранён");
  expect(mocks.enqueue).toHaveBeenCalledTimes(1);
});
