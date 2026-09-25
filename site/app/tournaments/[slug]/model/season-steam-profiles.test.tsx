import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SeasonLobbyList } from "../sections/SeasonLobbyDisplay";
import {
  seasonLobbyPlayerCount,
  seasonLobbySteamProfileUrls,
} from "./season-steam-profiles";
import type {
  SeasonMatch,
  SeasonMatchParticipant,
  SeasonRound,
} from "./season-types";

function createParticipant(
  playerNumber: number,
  teamSide: "a" | "b",
): SeasonMatchParticipant {
  return {
    player_id: `player-${playerNumber}`,
    dota_id: String(1000 + playerNumber),
    nickname: `Игрок ${playerNumber}`,
    avatar_url: null,
    positions: null,
    team_side: teamSide,
    is_captain: playerNumber === 1 || playerNumber === 6,
    tier_snapshot: 5,
    slot_number: ((playerNumber - 1) % 5) + 1,
    is_host: playerNumber === 1,
  };
}

const participants = Array.from({ length: 10 }, (_, index) =>
  createParticipant(index + 1, index < 5 ? "a" : "b"),
);

const match: SeasonMatch = {
  id: 10,
  lobby_id: 20,
  round_id: 30,
  round_number: 1,
  lobby_name: "Лобби 1",
  scheduled_at: null,
  team_a_name: "Команда A",
  team_b_name: "Команда B",
  best_of: 2,
  team_a_score: null,
  team_b_score: null,
  result: null,
  status: "published",
  sort_order: 1,
  can_enter_lobby: true,
  host_player_id: "player-1",
  participants,
  games: [],
  substitutions: [],
};

const round = {
  round_kind: "regular",
  lobbies: [{
    id: 20,
    sort_order: 1,
    name: "Лобби 1",
    scheduled_at: null,
    matches: [match],
  }],
} as SeasonRound;

describe("Steam profiles for a season lobby", () => {
  it("builds exactly ten Steam links for the current lineup", () => {
    const urls = seasonLobbySteamProfileUrls(match);

    expect(urls).toHaveLength(seasonLobbyPlayerCount);
    expect(urls[0]).toBe(
      "https://steamcommunity.com/profiles/76561197960266729",
    );
    expect(urls[9]).toBe(
      "https://steamcommunity.com/profiles/76561197960266738",
    );
  });

  it("uses the incoming player's profile after a pre-match replacement", () => {
    const replacedMatch: SeasonMatch = {
      ...match,
      substitutions: [{
        id: 1,
        match_id: match.id,
        game_id: null,
        game_number: null,
        outgoing_player_id: "player-2",
        outgoing_dota_id: "1002",
        outgoing_nickname: "Игрок 2",
        incoming_player_id: "replacement",
        incoming_dota_id: "9000",
        incoming_nickname: "Замена",
        incoming_avatar_url: null,
        team_side: "a",
        technical_loss: false,
        note: null,
      }],
    };
    const urls = seasonLobbySteamProfileUrls(replacedMatch);

    expect(urls).toHaveLength(seasonLobbyPlayerCount);
    expect(urls).not.toContain(
      "https://steamcommunity.com/profiles/76561197960266730",
    );
    expect(urls).toContain(
      "https://steamcommunity.com/profiles/76561197960274728",
    );
  });

  it("shows the button only to the assigned lobby host", () => {
    const hostHtml = renderToStaticMarkup(
      <SeasonLobbyList
        isArchived={false}
        round={round}
        viewerPlayerId="player-1"
      />,
    );
    const otherPlayerHtml = renderToStaticMarkup(
      <SeasonLobbyList
        isArchived={false}
        round={round}
        viewerPlayerId="player-2"
      />,
    );

    expect(hostHtml).toContain("Проверить Steam-никнеймы");
    expect(otherPlayerHtml).not.toContain("Проверить Steam-никнеймы");
  });
});
