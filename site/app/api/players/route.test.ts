import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: mocks.session, responseFromAuthError: (error: unknown) => { throw error; } }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
import { GET } from "./route";
beforeEach(() => vi.resetAllMocks());
it("requires login", async () => {
  mocks.session.mockResolvedValue(null);
  expect((await GET(new Request("https://example.test?q=Player"))).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});
it("allows a standalone organizer to search profiles and obtain tiers and profile IDs", async () => {
  mocks.session.mockResolvedValue({ isAdmin: true, isStandaloneOrganizer: true });
  mocks.query.mockResolvedValue([{ ingame_name: "Player", tier: 8, dota_id: "12345", tier_status: "current" }]);
  const result = await GET(new Request("https://example.test?q=Player"));
  expect(result.status).toBe(200);
  expect((await result.json()).players[0]).toMatchObject({ tier: 8, dota_id: "12345" });
  expect(mocks.query.mock.calls[0][1]).toEqual(["Player"]);
});
