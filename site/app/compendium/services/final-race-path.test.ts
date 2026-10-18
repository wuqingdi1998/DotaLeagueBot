import { beforeEach, expect, it, vi } from "vitest";
import type { AuthUser } from "@/lib/auth";
const mocks = vi.hoisted(() => ({ one: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/db", () => ({ one: mocks.one,
  transaction: (work: (client: { query: typeof mocks.query }) => Promise<unknown>) => work({ query: mocks.query }),
}));
import { chooseFinalRacePath, starRaceQuestForPlayer } from "./final-race-path";
const user = { discordId: "1" } as AuthUser;
beforeEach(() => { vi.clearAllMocks(); });

it("requires a choice before checking a final-week quest", async () => {
  mocks.one.mockResolvedValue(null);
  await expect(starRaceQuestForPlayer("1", "2026-10-21")).rejects.toMatchObject({ code: "STAR_RACE_PATH_REQUIRED" });
});
it("resolves a late support choice without allowing previous days", async () => {
  mocks.one.mockResolvedValue({ path: "support", selectedOn: "2026-10-21" });
  await expect(starRaceQuestForPlayer("1", "2026-10-20")).rejects.toMatchObject({ code: "STAR_RACE_NOT_ACTIVE" });
  expect(await starRaceQuestForPlayer("1", "2026-10-21")).toMatchObject({ title: "Всеобщие любимчики", requirement: { heroIds: [5, 50, 31, 26, 14, 30] } });
  expect(await starRaceQuestForPlayer("1", "2026-10-25")).toMatchObject({ title: "Универсальный солдат", rewardStars: 5 });
});
it("preserves earlier-week quests without requiring a final path", async () => {
  expect(await starRaceQuestForPlayer("1", "2026-10-14")).toMatchObject({ title: "Командная работа", rewardStars: 3 });
  expect(mocks.one).not.toHaveBeenCalled();
});
it("is idempotent for the chosen path and rejects a different one", async () => {
  mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("SELECT path") ? [{ path: "support", selectedOn: "2026-10-23" }] : [] }));
  await expect(chooseFinalRacePath(user, "support", new Date("2026-10-23T12:00:00+03:00"))).resolves.toMatchObject({ path: "support" });
  await expect(chooseFinalRacePath(user, "core", new Date("2026-10-23T12:00:00+03:00"))).rejects.toMatchObject({ code: "STAR_RACE_PATH_LOCKED" });
});
it.each(["2026-10-18T23:59:59+03:00", "2026-10-26T00:00:00+03:00"])("rejects choosing outside the final week: %s", async (date) => {
  await expect(chooseFinalRacePath(user, "core", new Date(date))).rejects.toMatchObject({ code: "STAR_RACE_NOT_ACTIVE" });
  expect(mocks.query).not.toHaveBeenCalled();
});
