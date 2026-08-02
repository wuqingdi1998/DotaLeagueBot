import { describe, expect, it } from "vitest";
import { buildCompendiumAdminParticipants } from "./model";
import type { CompendiumAdminSourceRow } from "./types";

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
    ...input,
  };
}

describe("compendium organizer base", () => {
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
});
