import { describe, expect, it } from "vitest";
import {
  addPendingOauthState,
  maxPendingOauthStates,
  oauthStateLifetimeMs,
  parsePendingOauthStates,
  takePendingOauthState,
  type PendingOauthState,
} from "./oauth-state";

function entry(state: string, createdAt: number): PendingOauthState {
  return { state, returnTo: `/${state}`, createdAt };
}

describe("Discord OAuth state", () => {
  it("keeps independent login attempts from several tabs", () => {
    const pending = [entry("first", 1), entry("second", 2)];
    const consumed = takePendingOauthState(pending, "first");

    expect(consumed.returnTo).toBe("/first");
    expect(consumed.remaining).toEqual([entry("second", 2)]);
  });

  it("does not delete pending attempts when state is unknown", () => {
    const pending = [entry("first", 1), entry("second", 2)];
    const consumed = takePendingOauthState(pending, "unknown");

    expect(consumed.returnTo).toBeNull();
    expect(consumed.remaining).toEqual(pending);
  });

  it("drops expired and malformed cookie entries", () => {
    const now = oauthStateLifetimeMs + 100;
    const raw = JSON.stringify([
      entry("expired", 1),
      entry("valid", now - 1),
      { state: 123, returnTo: "/" },
    ]);

    expect(parsePendingOauthStates(raw, now)).toEqual([
      entry("valid", now - 1),
    ]);
  });

  it("limits the number of pending tabs so the cookie stays small", () => {
    let pending: PendingOauthState[] = [];
    for (let index = 0; index < maxPendingOauthStates + 2; index += 1) {
      pending = addPendingOauthState(pending, entry(String(index), index));
    }

    expect(pending).toHaveLength(maxPendingOauthStates);
    expect(pending[0].state).toBe("2");
  });

  it("accepts the previous single-state cookie format during rollout", () => {
    expect(
      parsePendingOauthStates(
        JSON.stringify({ state: "legacy", returnTo: "/tournaments" }),
        123,
      ),
    ).toEqual([
      { state: "legacy", returnTo: "/tournaments", createdAt: 123 },
    ]);
  });
});
