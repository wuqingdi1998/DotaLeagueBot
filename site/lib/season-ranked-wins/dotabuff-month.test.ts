import { afterEach, describe, expect, it, vi } from "vitest";
import { dotabuffMonthlyMatchesFromHtml, fetchDotaBuffMonthlyRankedMatches } from "./dotabuff-month";
import { calculateRankedWinSnapshot } from "./model";

const now = new Date("2026-09-06T12:00:00Z");
function row(id: number, role = "Core Safe Lane", result = "Won", date = "2026-09-05T12:00:00Z") {
  return `<tr><td><a href="/matches/${id}">${result} Match</a><time datetime="${date}"></time></td><td>${role}</td></tr>`;
}
afterEach(() => vi.restoreAllMocks());

describe("Dotabuff independent monthly lookup", () => {
  it("maps exactly the five lane and role pairs", () => {
    const html = ["Core Safe Lane", "Core Mid Lane", "Core Off Lane", "Support Off Lane", "Support Safe Lane"]
      .map((role, index) => row(index + 1, role)).join("");
    expect(dotabuffMonthlyMatchesFromHtml(html).map((match) => match.role)).toEqual([1, 2, 3, 4, 5]);
    expect(dotabuffMonthlyMatchesFromHtml(row(6, "Support Roaming"))[0].role).toBeNull();
  });
  it("counts only unique wins in the exact 30-day window", () => {
    const matches = dotabuffMonthlyMatchesFromHtml(row(1) + row(1) + row(2, "Support Safe Lane")
      + row(3, "Core Safe Lane", "Lost") + row(4, "Core Safe Lane", "Won", "2026-08-01T00:00:00Z"));
    expect(calculateRankedWinSnapshot({ matches, now, positions: { primaryRole: 1, secondaryRole: 5 } }))
      .toMatchObject({ primaryWins: 1, secondaryWins: 1 });
  });
  it("loads the next page and sends ranked/month filters", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(row(1) + '<a rel="next" href="?page=2">Next</a>'))
      .mockResolvedValueOnce(new Response(row(2)));
    expect(await fetchDotaBuffMonthlyRankedMatches("123", now)).toHaveLength(2);
    const url = fetch.mock.calls[0][0] as URL;
    expect(url.searchParams.get("date")).toBe("month");
    expect(url.searchParams.get("lobby_type")).toBe("ranked_matchmaking");
    expect((fetch.mock.calls[1][0] as URL).searchParams.get("page")).toBe("2");
  });
  it.each(["<html>Private profile</html>", "<html>Just a moment cf-chl-</html>", row(1, "Unknown"),
    row(1).replace('datetime="2026-09-05T12:00:00Z"', '')])("rejects unavailable or incomplete data", async (html) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(html));
    await expect(fetchDotaBuffMonthlyRankedMatches("123", now)).rejects.toThrow();
  });
  it("accepts an explicitly empty history", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("No matches found"));
    await expect(fetchDotaBuffMonthlyRankedMatches("123", now)).resolves.toEqual([]);
  });
  it("rejects an HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Forbidden", { status: 403 }));
    await expect(fetchDotaBuffMonthlyRankedMatches("123", now)).rejects.toThrow("403");
  });
});
