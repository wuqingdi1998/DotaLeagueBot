import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seasonTeamLineup } from "./season-lineup";
import { SeasonLobbyList } from "../sections/SeasonLobbyDisplay";
import type { SeasonMatch, SeasonRound } from "./season-types";
import { canSubstituteOnSecondMap } from "@/lib/season-substitution";

const match: SeasonMatch = {
  id: 10, lobby_id: 20, round_id: 30, round_number: 1, lobby_name: "Нижнее лобби",
  scheduled_at: null, team_a_name: "Левая команда", team_b_name: "Правая команда",
  best_of: 2, team_a_score: 1, team_b_score: 1, result: "draw", status: "completed",
  sort_order: 1, can_enter_lobby: false, host_player_id: "200",
  participants: [{
    player_id: "100", dota_id: "101", nickname: "Первый игрок", avatar_url: null,
    positions: null, team_side: "a", is_captain: true, tier_snapshot: 8,
    slot_number: 3, is_host: false,
  }],
  games: [{
    id: 1, match_id: 10, game_number: 1, dota_match_id: "123456", winner_side: "a",
    duration_seconds: null, status: "completed",
  }],
  substitutions: [{
    id: 1, match_id: 10, game_id: 2, game_number: 2, outgoing_player_id: "100",
    outgoing_dota_id: "101", outgoing_nickname: "Первый игрок", incoming_player_id: "200",
    incoming_dota_id: "201", incoming_nickname: "Второй игрок", incoming_avatar_url: null,
    incoming_tier: 6, incoming_is_captain: true, team_side: "a", technical_loss: true, note: null,
  }],
};

describe("season lineup by map", () => {
  it("puts the crossed-out first player immediately before the replacement in the same slot", () => {
    const lineup = seasonTeamLineup(match, "a");
    expect(lineup.map((player) => [player.nickname, player.isFormerPlayer, player.mapLabel, player.slot_number]))
      .toEqual([["Первый игрок", true, "(1-я карта)", 3], ["Второй игрок", false, "(2-я карта)", 3]]);
    expect(lineup[1]).toMatchObject({ dota_id: "201", is_host: true, is_captain: true, tier_snapshot: 6 });
    expect(seasonTeamLineup(match, "b")).toEqual([]);
  });

  it("shows only the incoming player for a replacement before the whole match", () => {
    const fullMatch = { ...match, substitutions: [{ ...match.substitutions[0], game_number: null, game_id: null }] };
    expect(seasonTeamLineup(fullMatch, "a")).toHaveLength(1);
    expect(seasonTeamLineup(fullMatch, "a")[0]).toMatchObject({ nickname: "Второй игрок", mapLabel: null, isFormerPlayer: false });
  });

  it("leaves an unchanged lineup intact", () => {
    expect(seasonTeamLineup({ ...match, substitutions: [] }, "a")[0])
      .toMatchObject({ nickname: "Первый игрок", mapLabel: null, isFormerPlayer: false });
  });

  it("renders both map labels, strikes out only the former name and counts five active slots", () => {
    const round = { round_kind: "regular", lobbies: [{ id: 20, sort_order: 3, name: "Нижнее лобби", scheduled_at: null, matches: [match] }] } as SeasonRound;
    const html = renderToStaticMarkup(<SeasonLobbyList round={round} isArchived={false} />);
    expect(html).toContain("<s>Первый игрок</s>");
    expect(html).not.toContain("<s>Второй игрок</s>");
    expect(html).toContain("(1-я карта)");
    expect(html).toContain("(2-я карта)");
    expect(html).toContain('href="/players/201"');
    expect(html).toContain('Сумма тиров</small><strong>6</strong>');
  });
});

describe("substitution timing", () => {
  it("opens after the first map result without requiring a second map record", () => {
    expect(canSubstituteOnSecondMap(match.games)).toBe(true);
    expect(canSubstituteOnSecondMap([])).toBe(false);
  });

  it.each([
    { status: "published" }, { dota_match_id: null }, { winner_side: null },
  ])("requires a saved first-map result: %s", (changes) => {
    expect(canSubstituteOnSecondMap([{ ...match.games[0], ...changes }])).toBe(false);
  });

  it("keeps retrospective edits available for a completed second map", () => {
    expect(canSubstituteOnSecondMap([{ ...match.games[0], game_number: 2, dota_match_id: null }])).toBe(true);
  });
});
