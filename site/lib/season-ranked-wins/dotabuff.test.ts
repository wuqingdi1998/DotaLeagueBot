import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dotabuffMatchesFromHtml,
  fetchDotaBuffRankedMatches,
} from "./dotabuff";

describe("DotaBuff season ranked wins", () => {
  it("extracts match ids, results, dates and positions from match rows", () => {
    const matches = dotabuffMatchesFromHtml(`
      <table><tbody>
        <tr class="role-core">
          <td><a href="/matches/123">Won Match</a></td>
          <td>Core · Safe Lane</td>
          <td><time datetime="2026-08-20T12:00:00Z">20 Aug</time></td>
        </tr>
        <tr class="role-support">
          <td><a href="/matches/124">Lost Match</a></td>
          <td>Support · Off Lane</td>
          <td data-value="1787313600">21 Aug</td>
        </tr>
      </tbody></table>
    `);

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({ matchId: "123", role: 1, won: true });
    expect(matches[1]).toMatchObject({ matchId: "124", role: 4, won: false });
  });

  it("requests ranked matches without a calendar-month filter", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("<table></table>", { status: 200 }));

    await fetchDotaBuffRankedMatches("20", new Date("2026-08-27T12:00:00Z"));

    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.searchParams.get("lobby_type")).toBe(
      "ranked_matchmaking",
    );
    expect(requestedUrl.searchParams.has("date")).toBe(false);
  });

  afterEach(() => vi.restoreAllMocks());
});
