import { describe, expect, it } from "vitest";
import { FEARLESS_DRAFT_BOT_PLAYER_ID } from "./bot";
import {
  buildLobbyPreviewBotCaptain,
  buildLobbyPreviewRoster,
} from "./lobby-preview";

const profiles = Array.from({ length: 9 }, (_, index) => ({
  id: `real-${index + 1}`,
  dotaId: `${1000 + index}`,
  name: `Player ${index + 1}`,
  avatarUrl: `https://example.com/${index + 1}.jpg`,
}));

describe("Fearless Draft lobby preview roster", () => {
  it("keeps the viewer in the first captain slot and creates two teams of five", () => {
    const roster = buildLobbyPreviewRoster({
      viewer: {
        id: "viewer",
        dotaId: "777",
        name: "Viewer",
        avatarUrl: "https://example.com/viewer.jpg",
      },
      profiles,
      botCaptainId: FEARLESS_DRAFT_BOT_PLAYER_ID,
    });

    expect(roster).toHaveLength(10);
    expect(roster.filter((player) => player.teamSide === "a")).toHaveLength(5);
    expect(roster.filter((player) => player.teamSide === "b")).toHaveLength(5);
    expect(roster[0]).toMatchObject({ id: "viewer", teamSide: "a" });
    expect(roster[5]).toMatchObject({
      id: FEARLESS_DRAFT_BOT_PLAYER_ID,
      dotaId: profiles[4].dotaId,
      teamSide: "b",
    });
    expect(roster.every((player) => player.isOnline)).toBe(true);
    expect(buildLobbyPreviewBotCaptain(
      roster,
      FEARLESS_DRAFT_BOT_PLAYER_ID,
    )).toEqual({
      id: FEARLESS_DRAFT_BOT_PLAYER_ID,
      name: profiles[4].name,
      discordName: profiles[4].name,
      avatarUrl: profiles[4].avatarUrl,
    });
  });

  it("requires exactly nine participant profiles", () => {
    expect(() => buildLobbyPreviewRoster({
      viewer: profiles[0],
      profiles: profiles.slice(0, 8),
      botCaptainId: FEARLESS_DRAFT_BOT_PLAYER_ID,
    })).toThrow("Для предпросмотра нужны девять профилей");
  });
});
