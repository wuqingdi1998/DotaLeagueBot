import { describe, expect, it } from "vitest";
import type { OctoberClanMember } from "./clan-members";
import { octoberClanTotalPoints, rankOctoberClanMembers } from "./clan-standings";

const members: OctoberClanMember[] = [
  { discordId: "3", dotaId: "103", playerName: "Вега", clanId: "morbus", totalPoints: 3 },
  { discordId: "2", dotaId: "102", playerName: "Бета", clanId: "morbus", totalPoints: 8 },
  { discordId: "1", dotaId: "101", playerName: "Альфа", clanId: "morbus", totalPoints: 8 },
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
});
