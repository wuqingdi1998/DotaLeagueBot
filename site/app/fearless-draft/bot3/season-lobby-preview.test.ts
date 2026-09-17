import { describe, expect, it } from "vitest";
import type { FearlessDraftSnapshot } from "../model/snapshot";
import { buildBot3SeasonLobbySnapshot } from "./season-lobby-preview";

function draftSnapshot(): FearlessDraftSnapshot {
  const players = Array.from({ length: 10 }, (_, index) => ({
    id: String(100 + index),
    dotaId: String(200 + index),
    name: `Игрок ${index + 1}`,
    serverName: `Имя ${index + 1}`,
    avatarUrl: null,
    teamSide: index < 5 ? "a" as const : "b" as const,
    isOnline: true,
    slotNumber: index % 5 + 1,
    isCaptain: index === 0 || index === 5,
  }));
  return {
    serverNow: "2026-09-17T12:00:00.000Z",
    user: { id: "100", name: "Игрок 1", discordName: "user", avatarUrl: null },
    isOrganizer: true,
    isWaiting: false,
    waitingPlayers: [],
    invitations: [],
    lobbyPlayers: players,
    series: {
      id: 7,
      format: "BO3",
      status: "DRAFTING",
      currentMap: 1,
      isLobbyPreview: true,
      isSeasonLobbyPreview: true,
    } as FearlessDraftSnapshot["series"],
  };
}

describe("Bot3 season lobby preview", () => {
  it("creates two full online teams and records automatic captain votes", () => {
    const room = buildBot3SeasonLobbySnapshot(draftSnapshot());
    expect(room.players).toHaveLength(10);
    expect(room.players.filter((player) => player.teamSide === "a")).toHaveLength(5);
    expect(room.players.filter((player) => player.teamSide === "b")).toHaveLength(5);
    expect(room.players.every((player) => player.isOnline)).toBe(true);
    expect(room.captainBallots).toHaveLength(10);
    expect(room.draftSeriesId).toBe(7);
  });

  it("rejects an incomplete or ordinary preview roster", () => {
    const draft = draftSnapshot();
    draft.lobbyPlayers = draft.lobbyPlayers?.slice(0, 9);
    expect(() => buildBot3SeasonLobbySnapshot(draft)).toThrow(
      "Bot3 требует активное сезонное тестовое лобби",
    );
  });
});

