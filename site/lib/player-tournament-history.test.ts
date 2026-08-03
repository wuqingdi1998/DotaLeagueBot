import { describe, expect, it } from "vitest";
import {
  historicalNickname,
  tournamentHistoryResultLabel,
} from "./player-tournament-history";

describe("historical tournament nickname", () => {
  it("shows a nickname that differs from the current one", () => {
    expect(historicalNickname("Ame's Bastard", "NineTeen")).toBe("NineTeen");
  });

  it("hides the annotation after the player returns to the same nickname", () => {
    expect(historicalNickname("NineTeen", "NineTeen")).toBeNull();
    expect(historicalNickname("  NINETEEN ", "NineTeen")).toBeNull();
  });
});

describe("seasonal tournament result label", () => {
  it("shows a place only for a player from the main standings", () => {
    expect(tournamentHistoryResultLabel({
      tournament_type: "seasonal",
      rank_snapshot: 5,
      standings_section: "active",
      result_label: null,
    })).toBe("Место в сезонной таблице — 5");
  });

  it("does not turn an inactive-list rank into a season place", () => {
    expect(tournamentHistoryResultLabel({
      tournament_type: "seasonal",
      rank_snapshot: 5,
      standings_section: "inactive",
      result_label: null,
    })).toBe("Вне общей таблицы");
  });

  it("keeps a medal result ahead of the standings section", () => {
    expect(tournamentHistoryResultLabel({
      tournament_type: "seasonal",
      rank_snapshot: null,
      standings_section: "inactive",
      result_label: "Победитель",
    })).toBe("Победитель");
  });
});
