import { describe, expect, it } from "vitest";
import { buildCompendiumAdminParticipants } from "./model";
import type { CompendiumAdminSourceRow } from "./types";
import type { CompendiumAdminCurrentQuestSourceRow } from "./types";

function row(
  input: Partial<CompendiumAdminSourceRow> = {},
): CompendiumAdminSourceRow {
  return {
    player_id: "100",
    player_name: "Игрок",
    dota_id: "200",
    avatar_url: "https://cdn.discordapp.com/avatars/100/avatar.png",
    total_stars: 1,
    history_kind: "quest",
    completion_id: "300",
    moscow_date: "2026-08-01",
    quest_position: 2,
    matched_hero_id: 2,
    matched_match_id: "400",
    completed_at: new Date("2026-08-01T12:00:00.000Z"),
    reward_amount: 1,
    quest_hero_id: 1,
    hero_position: 1,
    administrator_name: null,
    team_a_name: null,
    team_b_name: null,
    predicted_score: null,
    actual_score: null,
    ...input,
  };
}

describe("compendium organizer base", () => {
  it("groups each participant's current heroes into three quest cards", () => {
    const currentQuestRows: CompendiumAdminCurrentQuestSourceRow[] = [
      { player_id: "100", quest_id: "901", quest_position: 1, hero_id: 1, hero_position: 1 },
      { player_id: "100", quest_id: "901", quest_position: 1, hero_id: 2, hero_position: 2 },
      { player_id: "100", quest_id: "902", quest_position: 2, hero_id: 3, hero_position: 1 },
      { player_id: "100", quest_id: "903", quest_position: 3, hero_id: 4, hero_position: 1 },
    ];
    const participants = buildCompendiumAdminParticipants(
      [row()],
      currentQuestRows,
    );

    expect(participants[0].currentQuests).toHaveLength(3);
    expect(participants[0].currentQuests[0]).toMatchObject({
      id: "901",
      position: 1,
      heroes: [{ id: 1 }, { id: 2 }],
    });
  });

  it("groups four quest heroes into one rewarded star", () => {
    const participants = buildCompendiumAdminParticipants([
      row({ quest_hero_id: 1, hero_position: 1 }),
      row({ quest_hero_id: 2, hero_position: 2 }),
      row({ quest_hero_id: 3, hero_position: 3 }),
      row({ quest_hero_id: 4, hero_position: 4 }),
    ]);

    expect(participants).toHaveLength(1);
    expect(participants[0].totalStars).toBe(1);
    expect(participants[0].avatarUrl).toContain("cdn.discordapp.com");
    expect(participants[0].rewards).toHaveLength(1);
    const reward = participants[0].rewards[0];
    expect(reward.kind).toBe("quest");
    if (reward.kind !== "quest") throw new Error("Expected a quest reward");
    expect(reward.heroes).toHaveLength(4);
    expect(reward.matchedHeroId).toBe(2);
  });

  it("keeps participants without stars in the base", () => {
    const participants = buildCompendiumAdminParticipants([
      row({
        player_id: "101",
        player_name: "Без звёзд",
        total_stars: 0,
        history_kind: null,
        completion_id: null,
        moscow_date: null,
        quest_position: null,
        matched_hero_id: null,
        matched_match_id: null,
        completed_at: null,
        reward_amount: null,
        quest_hero_id: null,
        hero_position: null,
      }),
    ]);

    expect(participants[0].rewards).toEqual([]);
  });

  it("shows positive and negative administrator adjustments in history", () => {
    const participants = buildCompendiumAdminParticipants([
      row({
        history_kind: "admin",
        completion_id: "501",
        quest_position: null,
        matched_hero_id: null,
        matched_match_id: null,
        reward_amount: 5,
        quest_hero_id: null,
        hero_position: null,
        administrator_name: "Organizer",
      }),
      row({
        history_kind: "admin",
        completion_id: "502",
        quest_position: null,
        matched_hero_id: null,
        matched_match_id: null,
        reward_amount: -2,
        quest_hero_id: null,
        hero_position: null,
        administrator_name: "Organizer",
      }),
    ]);
    expect(participants[0].rewards.map((reward) => reward.kind)).toEqual([
      "admin",
      "admin",
    ]);
    expect(participants[0].rewards.map((reward) => reward.rewardAmount)).toEqual([
      -2,
      5,
    ]);
  });

  it("shows prediction rewards with the selected and actual score", () => {
    const participants = buildCompendiumAdminParticipants([
      row({
        history_kind: "prediction",
        completion_id: "601",
        quest_position: null,
        matched_hero_id: null,
        matched_match_id: null,
        quest_hero_id: null,
        hero_position: null,
        reward_amount: 2,
        team_a_name: "Team Spirit",
        team_b_name: "Team Liquid",
        predicted_score: "2:1",
        actual_score: "2:1",
      }),
    ]);
    expect(participants[0].rewards[0]).toMatchObject({
      kind: "prediction",
      rewardAmount: 2,
      predictedScore: "2:1",
      actualScore: "2:1",
    });
  });

  it("shows rune challenge wins as a separate reward source", () => {
    const participants = buildCompendiumAdminParticipants([
      row({
        history_kind: "rune",
        completion_id: "701",
        quest_position: null,
        matched_hero_id: 1,
        matched_match_id: "8001",
        quest_hero_id: 1,
        hero_position: 1,
      }),
    ]);

    expect(participants[0].rewards[0]).toMatchObject({
      kind: "rune",
      matchedMatchId: "8001",
      hero: { id: 1, name: "Anti-Mage" },
    });
  });

  it("groups star race wins into one visible reward source", () => {
    const participants = buildCompendiumAdminParticipants([
      row({
        history_kind: "star_race",
        completion_id: "801",
        quest_position: 1,
        matched_hero_id: 1,
        matched_match_id: "9001",
        quest_hero_id: null,
        hero_position: null,
        reward_amount: 2,
      }),
      row({
        history_kind: "star_race",
        completion_id: "801",
        quest_position: 2,
        matched_hero_id: 2,
        matched_match_id: "9002",
        quest_hero_id: null,
        hero_position: null,
        reward_amount: 2,
      }),
    ]);

    expect(participants[0].rewards).toHaveLength(1);
    expect(participants[0].rewards[0]).toMatchObject({
      kind: "star_race",
      rewardAmount: 2,
      wins: [
        { matchedMatchId: "9001", hero: { id: 1, name: "Anti-Mage" } },
        { matchedMatchId: "9002", hero: { id: 2, name: "Axe" } },
      ],
    });
  });
});
