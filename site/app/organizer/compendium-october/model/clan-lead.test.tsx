import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OctoberClanPrizeBoard } from "../components/OctoberClanPrizeBoard";
import { octoberClanLead } from "./clan-standings";
import type { OctoberClanMember } from "./clan-members";

function members(morbus: number, panacea: number): OctoberClanMember[] {
  return ([
    { clanId: "morbus", totalPoints: morbus },
    { clanId: "panacea", totalPoints: panacea },
  ] satisfies Pick<OctoberClanMember, "clanId" | "totalPoints">[]).map((member, index) => ({ ...member, discordId: String(index), dotaId: String(index), playerName: "Игрок", avatarUrl: null }));
}

describe("clan lead beside prizes", () => {
  it("uses every member's points and identifies either leader", () => {
    expect(octoberClanLead([...members(7, 12), ...members(9, 1)]))
      .toMatchObject({ leader: { id: "morbus" }, advantage: 3 });
    expect(octoberClanLead(members(1, 12)))
      .toMatchObject({ leader: { id: "panacea" }, advantage: 11 });
  });

  it.each([[0, 0], [10, 10]])("shows a tie for %i versus %i", (left, right) => {
    expect(octoberClanLead(members(left, right))).toEqual({ leader: null, advantage: 0 });
    expect(renderToStaticMarkup(<OctoberClanPrizeBoard members={members(left, right)} />))
      .toContain("Кланы идут наравне");
  });

  it.each([[1, "звезду"], [2, "звезды"], [11, "звёзд"], [21, "звезду"]])(
    "shows the leader and a correctly worded %i star advantage", (advantage, word) => {
      const html = renderToStaticMarkup(<OctoberClanPrizeBoard members={members(advantage + 5, 5)} />);
      expect(html).toContain("Лидирует Морбус");
      expect(html).toContain(`Впереди на ${advantage} ${word}`);
      expect(html.indexOf("october-clan-lead")).toBeLessThan(html.indexOf('class="october-clan-prize-lists"'));
    },
  );
});
