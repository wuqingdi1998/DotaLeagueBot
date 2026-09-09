import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  one: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  one: mocks.one,
  query: mocks.query,
}));

import {
  loadTournamentDirectoryPreferences,
  saveTournamentDirectoryPreferences,
} from "./tournament-directory-preferences";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("tournament directory preference storage", () => {
  it("uses the unchecked default for guests and participants without a row", async () => {
    expect(await loadTournamentDirectoryPreferences(null)).toEqual({
      shouldHideArchivedTournaments: false,
    });
    expect(mocks.one).not.toHaveBeenCalled();

    mocks.one.mockResolvedValue(null);
    expect(await loadTournamentDirectoryPreferences("123")).toEqual({
      shouldHideArchivedTournaments: false,
    });
  });

  it("loads a participant's saved value", async () => {
    mocks.one.mockResolvedValue({ shouldHideArchivedTournaments: true });

    expect(await loadTournamentDirectoryPreferences("123")).toEqual({
      shouldHideArchivedTournaments: true,
    });
  });

  it("updates or creates the participant's preference", async () => {
    await saveTournamentDirectoryPreferences("123", false);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (player_id) DO UPDATE"),
      ["123", false],
    );
  });
});
