import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const channels = source("./live-update-events.ts");
const draftRoute = source("../app/api/fearless-draft/route.ts");
const draftEvents = source("../app/api/fearless-draft/events/route.ts");
const lobbyRoute = source(
  "../app/api/season/lobby-room/[matchId]/route.ts",
);
const lobbyEvents = source(
  "../app/api/season/lobby-room/[matchId]/events/route.ts",
);

describe("live room updates", () => {
  it("publishes draft actions to every connected viewer immediately", () => {
    expect(channels).toContain("publishLiveUpdate");
    expect(draftRoute).toContain(
      "publishLiveUpdate(fearlessDraftChannel(seasonMatchId))",
    );
    expect(draftEvents).toContain("subscribeToLiveUpdates");
  });

  it("publishes lobby chat and actions immediately", () => {
    expect(lobbyRoute).toContain(
      "publishLiveUpdate(seasonLobbyChannel(matchId))",
    );
    expect(lobbyEvents).toContain("subscribeToLiveUpdates");
    expect(lobbyEvents).toContain("draftingUpdateIntervalMs = 5_000");
  });
});
