import { describe, expect, it } from "vitest";
import { seasonLobbyDraftFormat } from "./season-lobby-room";

describe("season lobby captain voting", () => {
  it("supports the formats prepared by Fearless Draft", () => {
    expect(seasonLobbyDraftFormat(1)).toBeNull();
    expect(seasonLobbyDraftFormat(2)).toBe("BO2");
    expect(seasonLobbyDraftFormat(3)).toBe("BO3");
    expect(seasonLobbyDraftFormat(5)).toBeNull();
  });
});
