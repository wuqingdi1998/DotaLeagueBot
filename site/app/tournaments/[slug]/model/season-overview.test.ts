import { describe, expect, it } from "vitest";
import { latestFullyCompletedSeasonRound } from "./season-overview";

function round(
  roundNumber: number,
  matchStatuses: Array<"published" | "completed">,
  options: {
    isVisible?: boolean;
    lobbyCount?: number;
    roundKind?: "regular" | "finals";
    status?: "planned" | "active" | "completed";
  } = {},
) {
  return {
    is_visible: options.isVisible ?? true,
    lobby_count: options.lobbyCount ?? matchStatuses.length,
    lobbies: matchStatuses.map((status, index) => ({
      id: roundNumber * 10 + index,
      matches: [{ id: roundNumber * 100 + index, status }],
    })),
    round_kind: options.roundKind ?? "regular" as const,
    round_number: roundNumber,
    status: options.status ?? "completed" as const,
  };
}

describe("season overview recent round", () => {
  it("waits until every lobby in the newest round is completed", () => {
    const completedRound = round(4, ["completed", "completed"]);
    const partlyCompletedRound = round(5, ["completed", "published"]);

    expect(
      latestFullyCompletedSeasonRound([
        completedRound,
        partlyCompletedRound,
      ]),
    ).toBe(completedRound);
  });

  it("accepts whichever lobby finishes last once all results are recorded", () => {
    const newestRound = round(7, ["completed", "completed", "completed"]);

    expect(
      latestFullyCompletedSeasonRound([
        round(6, ["completed", "completed"]),
        newestRound,
      ]),
    ).toBe(newestRound);
  });

  it("rejects a round when a configured lobby is missing", () => {
    const incompleteRound = round(8, ["completed", "completed"], {
      lobbyCount: 3,
    });

    expect(latestFullyCompletedSeasonRound([incompleteRound])).toBeUndefined();
  });

  it("ignores hidden rounds", () => {
    const publicRound = round(2, ["completed", "completed"]);

    expect(
      latestFullyCompletedSeasonRound([
        publicRound,
        round(3, ["completed", "completed"], { isVisible: false }),
      ]),
    ).toBe(publicRound);
  });

  it("uses completed finals as the newest stage after both matches finish", () => {
    const finals = round(15, ["completed", "completed"], {
      lobbyCount: 2,
      roundKind: "finals",
      status: "completed",
    });

    expect(
      latestFullyCompletedSeasonRound([
        round(14, ["completed", "completed"]),
        finals,
      ]),
    ).toBe(finals);
  });

  it("does not show finals before both matches and the stage are completed", () => {
    const lastRegularRound = round(14, ["completed", "completed"]);

    expect(
      latestFullyCompletedSeasonRound([
        lastRegularRound,
        round(15, ["completed", "published"], {
          roundKind: "finals",
          status: "active",
        }),
      ]),
    ).toBe(lastRegularRound);
  });
});
