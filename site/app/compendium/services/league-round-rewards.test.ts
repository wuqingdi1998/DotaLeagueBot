import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { syncOctoberLeagueMatchStars } from "./league-round-rewards";
import { OCTOBER_COMPENDIUM_START_AT, OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";

describe("October league round rewards", () => {
  it("awards 1, 3 or 6 stars once per eligible season-nine match", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_eligible: true }] })
      .mockResolvedValueOnce({ rowCount: 10, rows: [] });

    await syncOctoberLeagueMatchStars({ query } as never, 42);

    expect(query).toHaveBeenCalledTimes(4);
    const [eligibilitySql, eligibilityParameters] = query.mock.calls[0];
    const [sql, parameters] = query.mock.calls[2];
    expect(eligibilitySql).toContain("tournament.slug = 'league-season-9'");
    expect(eligibilitySql).toContain("round.round_number = ANY($2::smallint[])");
    expect(eligibilityParameters).toEqual([42, [6, 7, 8], OCTOBER_COMPENDIUM_START_AT, OCTOBER_COMPENDIUM_END_AT]);
    expect(sql).toContain("END = 1 THEN $3::smallint");
    expect(sql).toContain("END >= 2 THEN $4::smallint");
    expect(sql).toContain("role.role_name = 'Массовка'");
    expect(sql).toContain("ON CONFLICT (player_id, season_match_id)");
    expect(sql).toContain("DO UPDATE SET amount = EXCLUDED.amount");
    expect(parameters).toEqual([42, 1, 3, 6]);
    expect(query.mock.calls[1][0]).toContain("FOR UPDATE OF member");
    expect(query.mock.calls[3][0]).toContain("SET total_points = total.total_stars");
    expect(query.mock.calls[3][1]).toEqual([42]);
  });

  it("does not touch Compendium data for another season or round", async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ is_eligible: false }],
    });

    await syncOctoberLeagueMatchStars({ query } as never, 43);

    expect(query).toHaveBeenCalledOnce();
  });

  it("runs after both organizer and lobby-room result publication", () => {
    const organizerAction = readFileSync(
      new URL("../../api/admin/season/season-published-lobby-actions.ts", import.meta.url),
      "utf8",
    );
    const lobbyRoomAction = readFileSync(
      new URL("../../season-lobby/[matchId]/server/game-result-service.ts", import.meta.url),
      "utf8",
    );

    expect(organizerAction).toContain("syncOctoberLeagueMatchStars(client, seasonMatchId)");
    expect(lobbyRoomAction).toContain("syncOctoberLeagueMatchStars(client, seasonMatchId)");
  });
});
