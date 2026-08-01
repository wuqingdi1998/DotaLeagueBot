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
    total_stars: 1,
    completion_id: "300",
    moscow_date: "2026-08-01",
    quest_position: 2,
    matched_hero_id: 2,
    matched_match_id: "400",
    completed_at: new Date("2026-08-01T12:00:00.000Z"),
    reward_amount: 1,
    quest_hero_id: 1,
    hero_position: 1,
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
    expect(participants[0].rewards).toHaveLength(1);
    expect(participants[0].rewards[0].heroes).toHaveLength(4);
    expect(participants[0].rewards[0].matchedHeroId).toBe(2);
  });

  it("keeps participants without stars in the base", () => {
    const participants = buildCompendiumAdminParticipants([
      row({
        player_id: "101",
        player_name: "Без звёзд",
        total_stars: 0,
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
});
