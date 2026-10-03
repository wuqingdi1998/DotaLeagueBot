import { describe, expect, it } from "vitest";
import {
  hiddenSubscriptionDiscordIds,
  hiddenSubscriptionRoleForDiscordId,
  hiddenSubscriptionRoleForDotaId,
} from "./hidden-subscription-entitlements";

describe("hidden subscription entitlements", () => {
  it("grants frokeng the Damage rune privileges without adding a visible role", () => {
    expect(hiddenSubscriptionDiscordIds).toEqual(["311247030422863882"]);
    expect(hiddenSubscriptionRoleForDiscordId("311247030422863882")).toBe(
      "Руна Усиления урона",
    );
    expect(hiddenSubscriptionRoleForDotaId("301109815")).toBe(
      "Руна Усиления урона",
    );
  });

  it("does not grant a hidden subscription to other players", () => {
    expect(hiddenSubscriptionRoleForDiscordId("1")).toBeNull();
    expect(hiddenSubscriptionRoleForDotaId("1")).toBeNull();
  });
});
