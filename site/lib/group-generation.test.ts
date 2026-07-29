import { describe, expect, it } from "vitest";
import {
  buildGroupMatchPlan,
  buildPostseasonMatches,
  buildRoundRobinMatches,
  buildSerpentineAssignments,
  GROUP_TEAM_PLACEHOLDER,
  parseGroupCount,
  shuffleTeamIds,
} from "./group-generation";

describe("group count validation", () => {
  it("accepts only whole group counts from 1 to 8", () => {
    expect(parseGroupCount(1)).toBe(1);
    expect(parseGroupCount(8)).toBe(8);
    expect(parseGroupCount(1.5)).toBeNull();
    expect(parseGroupCount(0)).toBeNull();
    expect(parseGroupCount(9)).toBeNull();
  });

  it("keeps the existing default of two groups", () => {
    expect(parseGroupCount(undefined)).toBe(2);
  });
});

describe("group team distribution", () => {
  const groups = [
    { id: 10, capacity: 4 },
    { id: 20, capacity: 4 },
  ];

  it("allows empty and partially filled groups", () => {
    expect(buildSerpentineAssignments([], groups)).toEqual([]);
    expect(buildSerpentineAssignments([1], groups)).toEqual([
      { groupId: 10, teamId: 1, sortOrder: 0 },
    ]);
  });

  it("keeps eight teams balanced across two groups", () => {
    const assignments = buildSerpentineAssignments(
      [1, 2, 3, 4, 5, 6, 7, 8],
      groups,
    );

    expect(assignments.filter(({ groupId }) => groupId === 10)).toHaveLength(4);
    expect(assignments.filter(({ groupId }) => groupId === 20)).toHaveLength(4);
  });

  it("supports deterministic shuffling for tests", () => {
    expect(shuffleTeamIds([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});

describe("automatic tournament matches", () => {
  it("plans every group match with TBA before teams register", () => {
    const matches = buildGroupMatchPlan([], 4);

    expect(matches).toHaveLength(6);
    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamAId: null,
          teamBId: null,
          teamAPlaceholder: GROUP_TEAM_PLACEHOLDER,
          teamBPlaceholder: GROUP_TEAM_PLACEHOLDER,
        }),
      ]),
    );
  });

  it("replaces only occupied TBA slots when a group is partially filled", () => {
    const matches = buildGroupMatchPlan([101, 202], 4);
    const teamAppearances = (teamId: number) =>
      matches.filter(
        (match) => match.teamAId === teamId || match.teamBId === teamId,
      ).length;

    expect(matches).toHaveLength(6);
    expect(teamAppearances(101)).toBe(3);
    expect(teamAppearances(202)).toBe(3);
    expect(
      matches.some(
        ({ teamAId, teamBId }) =>
          new Set([teamAId, teamBId]).has(101) &&
          new Set([teamAId, teamBId]).has(202),
      ),
    ).toBe(true);
    expect(
      matches.some(
        ({ teamAPlaceholder, teamBPlaceholder }) =>
          teamAPlaceholder === GROUP_TEAM_PLACEHOLDER &&
          teamBPlaceholder === GROUP_TEAM_PLACEHOLDER,
      ),
    ).toBe(true);
  });

  it("removes every TBA label from a full group", () => {
    const matches = buildGroupMatchPlan([1, 2, 3, 4], 4);

    expect(matches).toHaveLength(6);
    expect(
      matches.every(
        ({ teamAPlaceholder, teamBPlaceholder }) =>
          teamAPlaceholder === null && teamBPlaceholder === null,
      ),
    ).toBe(true);
  });

  it.each([
    [3, 3],
    [4, 6],
    [5, 10],
    [8, 28],
  ])(
    "creates the complete schedule for %i group slots",
    (capacity, expectedMatchCount) => {
      expect(buildGroupMatchPlan([], capacity)).toHaveLength(
        expectedMatchCount,
      );
    },
  );

  it("creates every round-robin pairing once", () => {
    const matches = buildRoundRobinMatches([1, 2, 3, 4, 5, 6]);
    const pairs = new Set(
      matches.map(({ teamAId, teamBId }) =>
        [teamAId, teamBId].sort((left, right) => left - right).join(":"),
      ),
    );

    expect(matches).toHaveLength(15);
    expect(pairs.size).toBe(15);
  });

  it("creates no group matches until at least two teams exist", () => {
    expect(buildRoundRobinMatches([])).toEqual([]);
    expect(buildRoundRobinMatches([1])).toEqual([]);
  });

  it("creates a grand-final placeholder when the playoff stage is omitted", () => {
    expect(
      buildPostseasonMatches({
        groupNames: ["Группа А"],
        advancingPerGroup: 2,
        hasPlayoffStage: false,
        playoffType: "double_elimination",
      }),
    ).toEqual([
      expect.objectContaining({
        bracketSide: "grand_final",
        stage: "Гранд-финал",
      }),
    ]);
  });

  it("creates playoff placeholders without registered teams", () => {
    const matches = buildPostseasonMatches({
      groupNames: ["Группа А", "Группа Б"],
      advancingPerGroup: 2,
      hasPlayoffStage: true,
      playoffType: "single_elimination",
    });

    expect(matches).toHaveLength(3);
    expect(matches.at(-1)?.bracketSide).toBe("grand_final");
  });
});
