import { describe, expect, it } from "vitest";
import type { FearlessDraftSnapshot } from "./snapshot";
import { isDraftCommandConfirmed } from "./command-confirmation";

function snapshot(): FearlessDraftSnapshot {
  const player1 = { id: "first", name: "First", discordName: "First", avatarUrl: null };
  const player2 = { ...player1, id: "second" };
  return {
    user: player2, serverNow: "2026-09-05T22:00:00Z", isOrganizer: false,
    isWaiting: false, waitingPlayers: [], invitations: [],
    series: {
      id: 1, format: "BO3", status: "CHOOSING", currentMap: 1,
      isLobbyPreview: false, map1CoinTossWinnerId: player1.id, player1, player2,
      player1Connected: true, player2Connected: true, player1ReadyForNextMap: false,
      player2ReadyForNextMap: false, endRequest: null, createdAt: "", updatedAt: "",
      map: {
        id: 10, number: 1, status: "SECOND_DECISION", coinTossWinnerId: player1.id,
        coinTossSegment: 0, firstChooserId: player1.id, firstChoice: "DIRE",
        secondChoice: null, radiantPlayerId: null, firstPickPlayerId: null,
        currentStep: 0, version: 1, currentActorId: null, currentAction: null,
        currentPhase: null, baseDurationSeconds: null, stepStartedAt: null,
        player1ReserveSeconds: 60, player2ReserveSeconds: 60, actions: [],
        heroSuggestions: [], unavailableHeroIds: [], createdAt: "",
      },
    },
  };
}

describe("confirmation after a lost draft response", () => {
  it("recognizes the saved first-pick choice even when the response was lost", () => {
    const before = snapshot();
    const after = structuredClone(before);
    after.series!.map.secondChoice = "FIRST";
    after.series!.map.status = "DRAFTING";
    expect(isDraftCommandConfirmed({ action: "MAKE_CHOICE", choice: "FIRST" }, before, after)).toBe(true);
  });

  it("does not mistake an opponent's change or a new map for this choice", () => {
    const before = snapshot();
    const after = structuredClone(before);
    after.series!.map.version += 1;
    expect(isDraftCommandConfirmed({ action: "MAKE_CHOICE", choice: "FIRST" }, before, after)).toBe(false);
    after.series!.map.secondChoice = "FIRST";
    after.series!.map.id += 1;
    expect(isDraftCommandConfirmed({ action: "MAKE_CHOICE", choice: "FIRST" }, before, after)).toBe(false);
  });

  it("requires the correct hero, player and step and excludes automatic choices", () => {
    const before = snapshot();
    const after = structuredClone(before);
    const command = { action: "SELECT_HERO", heroId: 1, expectedVersion: 1 } as const;
    const action = { step: 0, actorId: "second", type: "PICK", heroId: 1, isAutomatic: false, createdAt: "" } as const;
    after.series!.map.actions = [action];
    expect(isDraftCommandConfirmed(command, before, after)).toBe(true);
    for (const change of [{ step: 2 }, { actorId: "first" }, { heroId: 2 }, { isAutomatic: true }]) {
      after.series!.map.actions = [{ ...action, ...change }];
      expect(isDraftCommandConfirmed(command, before, after)).toBe(false);
    }
  });
});
