import { describe, expect, it } from "vitest";
import {
  filterParticipantDirectory,
  type ParticipantDirectoryFilters,
} from "./participant-filter";
import type { ParticipantDirectoryPlayer } from "./participants";

function player(
  nickname: string,
  tier: number,
  primaryRole: number,
  secondaryRole: number,
): ParticipantDirectoryPlayer {
  return {
    kind: "registered",
    identityId: nickname,
    discordId: nickname,
    dotaId: "1",
    nickname,
    aliases: [],
    avatarUrl: null,
    positions: `${primaryRole}/${secondaryRole}`,
    primaryRole,
    secondaryRole,
    tier,
    links: {
      dotabuff: "#",
      stratz: "#",
      steam: "#",
    },
  };
}

const defaultFilters: ParticipantDirectoryFilters = {
  search: "",
  role: null,
  tier: null,
  tierOrder: "desc",
  showArchived: false,
};

describe("participant directory filters", () => {
  it("places the selected primary role before the secondary role", () => {
    const players = [
      player("secondary-12", 12, 2, 1),
      player("primary-7", 7, 1, 3),
      player("primary-10", 10, 1, 2),
      player("secondary-8", 8, 4, 1),
    ];
    expect(
      filterParticipantDirectory(players, {
        ...defaultFilters,
        role: 1,
      }).map(({ nickname }) => nickname),
    ).toEqual(["primary-10", "primary-7", "secondary-12", "secondary-8"]);
  });

  it("sorts tiers in either direction and accepts tier 12", () => {
    const players = [
      player("tier-6", 6, 1, 2),
      player("tier-12", 12, 2, 3),
      player("tier-1", 1, 3, 4),
    ];
    expect(
      filterParticipantDirectory(players, defaultFilters).map(
        ({ tier }) => tier,
      ),
    ).toEqual([12, 6, 1]);
    expect(
      filterParticipantDirectory(players, {
        ...defaultFilters,
        tierOrder: "asc",
      }).map(({ tier }) => tier),
    ).toEqual([1, 6, 12]);
  });

  it("switches from registered players to archive identities", () => {
    const archive = {
      ...player("archive", 5, 1, 2),
      kind: "archive" as const,
      dotaId: null,
      discordId: null,
      links: null,
    };
    const registered = player("registered", 6, 2, 3);
    expect(
      filterParticipantDirectory([registered, archive], defaultFilters),
    ).toEqual([registered]);
    expect(
      filterParticipantDirectory([registered, archive], {
        ...defaultFilters,
        showArchived: true,
      }),
    ).toEqual([archive]);
  });
});
