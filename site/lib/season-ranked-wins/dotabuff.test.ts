import { describe, expect, it } from "vitest";
import { dotabuffMatchesFromHtml } from "./dotabuff";

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
});
