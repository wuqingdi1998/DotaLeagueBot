import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadReplayWearables: vi.fn(),
  saveReplayWearables: vi.fn(),
}));

vi.mock("./replay-arcana-repository", () => ({
  loadReplayWearables: mocks.loadReplayWearables,
  saveReplayWearables: mocks.saveReplayWearables,
}));

import {
  hasPlayerEquippedArcanaInReplay,
  replayParserInvocation,
} from "./replay-arcana";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cached replay Arcana verification", () => {
  it("recognizes the Shadow Fiend and Spectre Arcana item IDs", async () => {
    mocks.loadReplayWearables.mockResolvedValue([
      { accountId: "1674981969", itemId: 6996 },
      { accountId: "157658130", itemId: 9662 },
    ]);
    const replayUrl = "http://replay123.valve.net/570/8955030491_456.dem.bz2";

    await expect(hasPlayerEquippedArcanaInReplay({
      matchId: "8955030491",
      replayUrl,
      dotaId: "1674981969",
    })).resolves.toBe(true);
    await expect(hasPlayerEquippedArcanaInReplay({
      matchId: "8955030491",
      replayUrl,
      dotaId: "157658130",
    })).resolves.toBe(true);
    expect(mocks.saveReplayWearables).not.toHaveBeenCalled();
  });
});

describe("replay parser process", () => {
  it("runs below the web server priority on Linux", () => {
    expect(replayParserInvocation(
      "/usr/local/bin/arcana-replay-parser",
      "http://replay123.valve.net/570/8955030491_456.dem.bz2",
      "linux",
    )).toEqual({
      file: "/bin/nice",
      arguments: [
        "-n",
        "19",
        "/usr/local/bin/arcana-replay-parser",
        "http://replay123.valve.net/570/8955030491_456.dem.bz2",
      ],
    });
  });
});
