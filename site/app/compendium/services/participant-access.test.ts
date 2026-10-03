import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  one: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ one: mocks.one }));
vi.mock("@/lib/auth", () => ({ requireSession: mocks.requireSession }));

import {
  COMPENDIUM_EXCLUDED_ROLE_NAME,
  isExcludedFromCompendium,
  requireCompendiumParticipantSession,
} from "./participant-access";

describe("compendium participant access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks the Massovka role from the shared Discord role directory", async () => {
    mocks.one.mockResolvedValue({ is_excluded: true });

    await expect(isExcludedFromCompendium("123")).resolves.toBe(true);
    expect(mocks.one).toHaveBeenCalledWith(
      expect.stringContaining("player_discord_roles"),
      ["123", COMPENDIUM_EXCLUDED_ROLE_NAME],
    );
  });

  it("allows a registered participant without the excluded role", async () => {
    const user = { discordId: "123" };
    mocks.requireSession.mockResolvedValue(user);
    mocks.one.mockResolvedValue({ is_excluded: false });

    await expect(requireCompendiumParticipantSession()).resolves.toBe(user);
  });

  it("rejects Massovka from every protected compendium action", async () => {
    mocks.requireSession.mockResolvedValue({ discordId: "123" });
    mocks.one.mockResolvedValue({ is_excluded: true });

    await expect(requireCompendiumParticipantSession()).rejects.toMatchObject({
      status: 403,
    });
  });
});
