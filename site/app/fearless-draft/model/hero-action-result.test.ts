import { describe, expect, it } from "vitest";
import { applyDraftHeroActionResult, type DraftHeroActionResult } from "./hero-action-result";
import type { FearlessDraftSnapshot } from "./snapshot";

function state(): FearlessDraftSnapshot {
  const first = { id: "10001", name: "A", discordName: "A", avatarUrl: null };
  const second = { ...first, id: "10002", name: "B" };
  return {
    serverNow: "2026-10-24T00:00:00Z", user: first, isOrganizer: false,
    isWaiting: false, invitations: [], waitingPlayers: [],
    series: {
      id: 1, format: "BO2", status: "DRAFTING", currentMap: 1,
      isLobbyPreview: false, isSeasonLobbyPreview: false, map1CoinTossWinnerId: first.id,
      player1: first, player2: second, player1Connected: true, player2Connected: true,
      player1ReadyForNextMap: false, player2ReadyForNextMap: false, endRequest: null,
      createdAt: "", updatedAt: "",
      map: {
        id: 5, number: 1, status: "DRAFTING", coinTossWinnerId: first.id,
        coinTossSegment: 100, firstChooserId: first.id, firstChoice: "FIRST",
        secondChoice: "RADIANT", radiantPlayerId: second.id, firstPickPlayerId: first.id,
        currentStep: 0, version: 2, currentActorId: first.id, currentAction: "BAN",
        currentPhase: "FIRST_BANS", baseDurationSeconds: 15,
        stepStartedAt: "2026-10-24T00:00:00Z", finalPickReviewEndsAt: null,
        player1ReserveSeconds: 130, player2ReserveSeconds: 130, previewHeroId: 1,
        actions: [], heroSuggestions: [{ heroId: 1, playerId: first.id, playerName: "A", colorSlot: 1 }],
        lineupAssignment: null, unavailableHeroIds: [], createdAt: "",
      },
    },
  };
}

function receipt(): DraftHeroActionResult {
  return {
    seriesId: 1, seriesStatus: "DRAFTING", seriesUpdatedAt: "2026-10-24T00:00:01Z",
    serverNow: "2026-10-24T00:00:01Z",
    map: { id: 5, status: "DRAFTING", currentStep: 1, version: 3,
      stepStartedAt: "2026-10-24T00:00:01Z", finalPickReviewEndsAt: null,
      player1ReserveSeconds: 129.5, player2ReserveSeconds: 130 },
    action: { step: 0, actorId: "10001", heroId: 1, type: "BAN", isAutomatic: false,
      createdAt: "2026-10-24T00:00:01Z" },
  };
}

describe("authoritative hero receipt", () => {
  it("applies the saved ban and exact next turn without another request", () => {
    const before = state();
    const next = applyDraftHeroActionResult(before, receipt());
    expect(next.series?.map).toMatchObject({ currentStep: 1, version: 3,
      currentActorId: "10001", currentAction: "BAN", previewHeroId: null,
      player1ReserveSeconds: 129.5, heroSuggestions: [], actions: [receipt().action] });
    expect(before.series?.map.actions).toEqual([]);
  });

  it("never applies a receipt from a different training, map or already newer live state", () => {
    for (const change of [{ seriesId: 2 }, { map: { ...receipt().map, id: 6 } },
      { map: { ...receipt().map, version: 2 } }, { action: { ...receipt().action, step: 1 } }]) {
      const current = state();
      expect(applyDraftHeroActionResult(current, { ...receipt(), ...change })).toBe(current);
    }
    const next = applyDraftHeroActionResult(state(), receipt());
    expect(applyDraftHeroActionResult(next, receipt())).toBe(next);
  });

  it("derives the opponent turn and preserves the final pick review", () => {
    const saved = receipt(); saved.map.currentStep = 2;
    expect(applyDraftHeroActionResult(state(), saved).series?.map.currentActorId).toBe("10002");
    saved.map.currentStep = 24; saved.map.status = "FINAL_PICK_REVIEW";
    saved.map.stepStartedAt = null; saved.map.finalPickReviewEndsAt = "2026-10-24T00:00:11Z";
    expect(applyDraftHeroActionResult(state(), saved).series?.map).toMatchObject({
      status: "FINAL_PICK_REVIEW", currentActorId: null, currentAction: null,
      baseDurationSeconds: null, finalPickReviewEndsAt: "2026-10-24T00:00:11Z",
    });
  });
});
