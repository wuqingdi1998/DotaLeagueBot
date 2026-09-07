import { describe, expect, it } from "vitest";
import type { DraftLobbyPlayer } from "./snapshot";
import { canViewDraftHeroPreview } from "./preview-visibility";

const lobbyPlayers: DraftLobbyPlayer[] = [
  {
    id: "captain-a",
    dotaId: "1",
    name: "Captain A",
    avatarUrl: null,
    teamSide: "a",
    isOnline: true,
    isCaptain: true,
  },
  {
    id: "teammate-a",
    dotaId: "2",
    name: "Teammate A",
    avatarUrl: null,
    teamSide: "a",
    isOnline: true,
  },
  {
    id: "captain-b",
    dotaId: "3",
    name: "Captain B",
    avatarUrl: null,
    teamSide: "b",
    isOnline: true,
    isCaptain: true,
  },
];

describe("Fearless Draft preview visibility", () => {
  it("shows the current highlight to its captain and captain's teammates", () => {
    expect(canViewDraftHeroPreview("captain-a", "captain-a", lobbyPlayers)).toBe(true);
    expect(canViewDraftHeroPreview("teammate-a", "captain-a", lobbyPlayers)).toBe(true);
  });

  it("keeps the current highlight hidden from the opposing team", () => {
    expect(canViewDraftHeroPreview("captain-b", "captain-a", lobbyPlayers)).toBe(false);
  });

  it("keeps standalone previews private to the acting player", () => {
    expect(canViewDraftHeroPreview("captain-a", "captain-a")).toBe(true);
    expect(canViewDraftHeroPreview("captain-b", "captain-a")).toBe(false);
  });
});
