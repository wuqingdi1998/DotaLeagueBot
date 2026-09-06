import { describe, expect, it } from "vitest";
import { dotabuffBrowserMatchUrl, parseDotabuffBrowserImport } from "./browser-import";

const now = new Date("2026-09-06T15:00:00Z");
const input = { dotaId: "100", startedAt: "2026-09-06T14:55:00Z", completedAt: "2026-09-06T15:00:00Z",
  matches: [{ matchId: "1", startedAt: "2026-09-05T15:00:00Z", won: true, role: 5 }] };
describe("Dotabuff browser evidence", () => {
  it("accepts recent bounded evidence", () => expect(parseDotabuffBrowserImport(input, now)).toEqual(input));
  it.each([null, {}, { ...input, dotaId: "../100" }, { ...input, startedAt: "invalid" },
    { ...input, completedAt: "2026-09-05T15:00:00Z" }, { ...input, completedAt: "2026-09-07T15:00:00Z" },
    { ...input, matches: new Array(2001).fill(input.matches[0]) },
    { ...input, matches: [{ ...input.matches[0], role: 6 }] },
    { ...input, matches: [{ ...input.matches[0], won: "true" }] },
    { ...input, matches: [{ ...input.matches[0], startedAt: "invalid" }] },
  ])("rejects invalid or stale imports", (value) => expect(parseDotabuffBrowserImport(value, now)).toBeNull());
  it("builds a fixed ranked monthly history URL", () => {
    expect(dotabuffBrowserMatchUrl("100", 2)).toBe("https://www.dotabuff.com/players/100/matches?lobby_type=ranked_matchmaking&date=month&page=2");
  });
});
