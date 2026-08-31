import { describe, expect, it } from "vitest";
import {
  canAdvanceSeasonLobbyDraft,
  shouldShowSeasonLobbyDraft,
} from "./draft-visibility";

describe("season lobby draft visibility", () => {
  it.each(["drafting", "playing", "break"] as const)(
    "keeps the draft visible while the room is %s",
    (status) => expect(shouldShowSeasonLobbyDraft(status)).toBe(true),
  );

  it.each(["waiting", "voting", "completed"] as const)(
    "hides the draft while the room is %s",
    (status) => expect(shouldShowSeasonLobbyDraft(status)).toBe(false),
  );

  it("allows the next map only after the host saves the current result", () => {
    expect(canAdvanceSeasonLobbyDraft("playing")).toBe(false);
    expect(canAdvanceSeasonLobbyDraft("break")).toBe(true);
  });
});
