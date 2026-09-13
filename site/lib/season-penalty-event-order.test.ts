import { describe, expect, it } from "vitest";
import { sortSeasonPenaltyEvents } from "./season-penalty-event-order";

const events = [
  {
    id: 1,
    nickname: "Alpha",
    round_number: 3,
    fire_count: 2,
    created_at: "2026-09-10T10:00:00.000Z",
  },
  {
    id: 2,
    nickname: "Bravo",
    round_number: 5,
    fire_count: 1,
    created_at: "2026-09-12T10:00:00.000Z",
  },
  {
    id: 3,
    nickname: "Charlie",
    round_number: 5,
    fire_count: 4,
    created_at: "2026-09-11T10:00:00.000Z",
  },
];

describe("season penalty event order", () => {
  it("sorts recently entered penalties first", () => {
    expect(sortSeasonPenaltyEvents(events, "createdAt").map(({ id }) => id))
      .toEqual([2, 3, 1]);
  });

  it("sorts later rounds first and uses fire count as the second criterion", () => {
    expect(sortSeasonPenaltyEvents(events, "round").map(({ id }) => id))
      .toEqual([3, 2, 1]);
  });

  it("does not mutate the source list", () => {
    sortSeasonPenaltyEvents(events, "round");
    expect(events.map(({ id }) => id)).toEqual([1, 2, 3]);
  });
});
