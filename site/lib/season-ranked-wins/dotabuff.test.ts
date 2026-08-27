import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dotabuffRolesFromHtml,
  fetchDotaBuffRolesForMatches,
} from "./dotabuff";

describe("DotaBuff missing-role fallback", () => {
  it("extracts roles only for the requested match rows", () => {
    const roles = dotabuffRolesFromHtml(
      `
        <table><tbody>
          <tr class="role-core">
            <td><a href="/matches/100">Won Match</a></td>
            <td>Core · Safe Lane</td>
          </tr>
          <tr class="role-support">
            <td><a href="/matches/101">Won Match</a></td>
            <td>Support · Off Lane</td>
          </tr>
          <tr class="role-core">
            <td><a href="/matches/102">Won Match</a></td>
            <td>Core · Mid Lane</td>
          </tr>
        </tbody></table>
      `,
      new Set(["100", "101"]),
    );

    expect(roles).toEqual(
      new Map<string, 1 | 2 | 3 | 4 | 5>([
        ["100", 1],
        ["101", 4],
      ]),
    );
  });

  it("does not invent a role when DotaBuff has no lane or role pair", () => {
    const roles = dotabuffRolesFromHtml(
      `<tr><td><a href="/matches/100">Won Match</a></td><td>Unknown</td></tr>`,
      new Set(["100"]),
    );

    expect(roles.size).toBe(0);
  });

  it("limits a missing-match lookup to five recent history pages", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          `<tr class="role-core"><td><a href="/matches/999">Won Match</a></td><td>Core · Safe Lane</td></tr>`,
          { status: 200 },
        ),
    );

    await expect(
      fetchDotaBuffRolesForMatches({ dotaId: "20", matchIds: ["100"] }),
    ).resolves.toEqual(new Map());
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  afterEach(() => vi.restoreAllMocks());
});
