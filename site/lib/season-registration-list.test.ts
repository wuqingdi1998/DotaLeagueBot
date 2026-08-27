import { describe, expect, it } from "vitest";
import {
  buildStratzRankedMatchesUrl,
  formatSeasonRankedWinsRefreshCountdown,
  formatSeasonRegistrationMoment,
  sortSeasonRegistrations,
} from "../app/tournaments/[slug]/model/season-registration";
import type { SeasonRoundRegistration } from "../app/tournaments/[slug]/model/season-types";

const registrations: SeasonRoundRegistration[] = [
  {
    round_id: 1,
    player_id: "2",
    dota_id: "2",
    nickname: "Яша",
    avatar_url: null,
    positions: "1/2",
    tier_snapshot: 5,
    created_at: "2026-08-17T10:00:02.000Z",
    is_checked_in: false,
    primary_role: null,
    secondary_role: null,
    primary_wins: null,
    secondary_wins: null,
    wins_checked_at: null,
  },
  {
    round_id: 1,
    player_id: "1",
    dota_id: "1",
    nickname: "Алекс",
    avatar_url: null,
    positions: "4/5",
    tier_snapshot: 10,
    created_at: "2026-08-17T10:00:01.000Z",
    is_checked_in: false,
    primary_role: 4,
    secondary_role: 5,
    primary_wins: 10,
    secondary_wins: 4,
    wins_checked_at: "2026-08-17T10:05:00.000Z",
  },
];

describe("season registration list", () => {
  it("sorts by registration time from oldest to newest by default", () => {
    expect(
      sortSeasonRegistrations(registrations, "createdAt", "ascending").map(
        (registration) => registration.player_id,
      ),
    ).toEqual(["1", "2"]);
  });

  it("sorts by nickname and tier in both directions", () => {
    expect(
      sortSeasonRegistrations(registrations, "nickname", "ascending").map(
        (registration) => registration.nickname,
      ),
    ).toEqual(["Алекс", "Яша"]);
    expect(
      sortSeasonRegistrations(registrations, "tier", "descending").map(
        (registration) => registration.tier_snapshot,
      ),
    ).toEqual([10, 5]);
  });

  it("keeps legacy registrations without a tier at the end", () => {
    const legacy = { ...registrations[0], player_id: "3", tier_snapshot: null };
    expect(
      sortSeasonRegistrations(
        [...registrations, legacy],
        "tier",
        "descending",
      ).map((registration) => registration.tier_snapshot),
    ).toEqual([10, 5, null]);
  });

  it("shows Moscow date and time with seconds", () => {
    expect(formatSeasonRegistrationMoment("2026-08-17T10:00:01.000Z")).toBe(
      "17.08.2026, 13:00:01",
    );
  });

  it("opens the player's Stratz matches filtered to ranked games for 30 days", () => {
    expect(
      buildStratzRankedMatchesUrl(
        "301109815",
        new Date("2026-08-27T12:00:00.000Z").getTime(),
      ),
    ).toBe(
      "https://stratz.com/players/301109815/matches?lobbyType=7&startDateTime=1785240000",
    );
  });

  it("counts down to the next ten-minute refresh from the latest completed check", () => {
    expect(
      formatSeasonRankedWinsRefreshCountdown(
        registrations,
        new Date("2026-08-17T10:12:00.000Z").getTime(),
      ),
    ).toBe("03:00");
    expect(
      formatSeasonRankedWinsRefreshCountdown(
        registrations,
        new Date("2026-08-17T10:15:01.000Z").getTime(),
      ),
    ).toBe("09:59");
  });

  it("shows that the first refresh is pending when nobody has been checked", () => {
    expect(
      formatSeasonRankedWinsRefreshCountdown(
        registrations.map((registration) => ({
          ...registration,
          wins_checked_at: null,
        })),
        new Date("2026-08-17T10:12:00.000Z").getTime(),
      ),
    ).toBeNull();
  });
});
