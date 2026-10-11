import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("./db", () => mocks);
import { loadPublicPlayerBadges } from "./player-profile-badges";
import { GET } from "@/app/api/players/[dotaId]/badges/route";

it("exposes the highest linked profile badges without caching and refreshes after an upgrade", async () => {
  mocks.query.mockResolvedValue([{ badge_key: "october-2026-morbus-bronze" }, { badge_key: "ti-2026-gold" }]);
  const response = await GET(new Request("https://site.test"), { params: Promise.resolve({ dotaId: "123" }) });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ badgeKeys: ["october-2026-morbus-bronze", "ti-2026-gold"] });
  mocks.query.mockResolvedValue([{ badge_key: "october-2026-morbus-bronze" }, { badge_key: "october-2026-morbus-silver" }]);
  expect(await loadPublicPlayerBadges("123")).toEqual(["october-2026-morbus-silver"]);
  expect(mocks.query.mock.calls[0][0]).toContain("player_identity_members");
});
it("distinguishes an existing player with no badges from an unknown or archived player", async () => {
  mocks.query.mockResolvedValue([{ badge_key: null }]);
  expect(await loadPublicPlayerBadges("123")).toEqual([]);
  mocks.query.mockResolvedValue([]);
  expect((await GET(new Request("https://site.test"), { params: Promise.resolve({ dotaId: "123" }) })).status).toBe(404);
  expect(await loadPublicPlayerBadges("bad")).toBeNull();
});
