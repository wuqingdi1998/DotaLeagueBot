import { describe, expect, it } from "vitest";
import {
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
    tier_snapshot: 5,
    created_at: "2026-08-17T10:00:02.000Z",
  },
  {
    round_id: 1,
    player_id: "1",
    dota_id: "1",
    nickname: "Алекс",
    avatar_url: null,
    tier_snapshot: 10,
    created_at: "2026-08-17T10:00:01.000Z",
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
});
