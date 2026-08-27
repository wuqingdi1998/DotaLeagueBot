import { describe, expect, it } from "vitest";
import {
  openDotaMatchesFromPayload,
  openDotaMatchPositionFromPayload,
} from "./opendota";

describe("OpenDota season ranked wins", () => {
  it("keeps ranked games and detects the player victory", () => {
    const matches = openDotaMatchesFromPayload([
      {
        match_id: 10,
        player_slot: 1,
        radiant_win: true,
        start_time: 1_700_000_000,
        lobby_type: 7,
        lane_role: 2,
      },
      {
        match_id: 11,
        player_slot: 129,
        radiant_win: true,
        start_time: 1_700_000_000,
        lobby_type: 7,
        lane_role: 3,
      },
      {
        match_id: 12,
        player_slot: 1,
        radiant_win: true,
        start_time: 1_700_000_000,
        lobby_type: 0,
      },
    ]);

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({ matchId: "10", role: 2, won: true });
    expect(matches[1]).toMatchObject({ matchId: "11", won: false });
  });

  it("separates farming and supporting players on side lanes", () => {
    const matches = openDotaMatchesFromPayload([
      {
        match_id: 20,
        player_slot: 1,
        radiant_win: true,
        start_time: 1_700_000_000,
        lobby_type: 7,
        lane_role: 1,
        gold_per_min: 510,
      },
      {
        match_id: 21,
        player_slot: 1,
        radiant_win: true,
        start_time: 1_700_000_000,
        lobby_type: 7,
        lane_role: 1,
        gold_per_min: 280,
      },
      {
        match_id: 22,
        player_slot: 1,
        radiant_win: true,
        start_time: 1_700_000_000,
        lobby_type: 7,
        lane_role: 3,
        is_roaming: true,
      },
    ]);

    expect(matches.map((match) => match.role)).toEqual([1, 5, 4]);
  });

  it("finds the requested player role in full match details", () => {
    expect(
      openDotaMatchPositionFromPayload(
        {
          players: [
            { account_id: 10, lane_role: 2 },
            { account_id: 20, lane_role: 3, gold_per_min: 260 },
          ],
        },
        "20",
      ),
    ).toBe(4);
  });
});
