import { describe, expect, it } from "vitest";
import { historicalNickname } from "./player-tournament-history";

describe("historical tournament nickname", () => {
  it("shows a nickname that differs from the current one", () => {
    expect(historicalNickname("Ame's Bastard", "NineTeen")).toBe("NineTeen");
  });

  it("hides the annotation after the player returns to the same nickname", () => {
    expect(historicalNickname("NineTeen", "NineTeen")).toBeNull();
    expect(historicalNickname("  NINETEEN ", "NineTeen")).toBeNull();
  });
});
