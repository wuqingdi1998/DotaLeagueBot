import { describe, expect, it } from "vitest";
import type { OctoberClanMember } from "./clan-members";
import {
  octoberClanCardRows,
  octoberClanTotalPoints,
  rankOctoberClanMembers,
} from "./clan-standings";

const members: OctoberClanMember[] = [
  { discordId: "3", dotaId: "103", playerName: "Вега", avatarUrl: null, clanId: "morbus", totalPoints: 3 },
  { discordId: "2", dotaId: "102", playerName: "Бета", avatarUrl: null, clanId: "morbus", totalPoints: 8 },
  { discordId: "1", dotaId: "101", playerName: "Альфа", avatarUrl: null, clanId: "morbus", totalPoints: 8 },
];

describe("October clan standings", () => {
  it("ranks members by points and then by name", () => {
    expect(rankOctoberClanMembers(members).map((member) => member.playerName)).toEqual([
      "Альфа",
      "Бета",
      "Вега",
    ]);
  });

  it("adds every member point to the clan total", () => {
    expect(octoberClanTotalPoints(members)).toBe(19);
  });

  it("adds an ellipsis and the viewer's actual place when they are below top ten", () => {
    const longStanding: OctoberClanMember[] = Array.from({ length: 12 }, (_, index) => ({
      discordId: String(index + 1),
      dotaId: String(100 + index),
      playerName: `Игрок ${index + 1}`,
      avatarUrl: null,
      clanId: "morbus",
      totalPoints: 12 - index,
    }));
    const rows = octoberClanCardRows(longStanding, "12");
    expect(rows).toHaveLength(12);
    expect(rows[10]).toEqual({ kind: "ellipsis" });
    expect(rows[11]).toMatchObject({ kind: "member", position: 12 });
  });

  it("does not duplicate the viewer when they are already in top ten", () => {
    expect(octoberClanCardRows(members, "1")).toHaveLength(3);
  });
});
