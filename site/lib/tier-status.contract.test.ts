import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeParticipantTierInput,
  outdatedTierApplicationError,
  type TierStatusApplicationPlayer,
} from "./player-tier-status";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const participants = source("./participants.ts");
const participantsTable = source(
  "../app/participants/ParticipantsTable.tsx",
);
const participantDialog = source(
  "../app/participants/ParticipantAdminDialog.tsx",
);
const participantAdmin = source("./player-identity-admin.ts");
const participantStyles = source(
  "../app/styles/32-participant-tier-status.css",
);
const globalStyles = source("../app/globals.css");
const applicationSupport = source(
  "../app/api/applications/application-support.ts",
);
const applicationRoute = source("../app/api/applications/route.ts");
const tierStatusModel = source("./player-tier-status.ts");

describe("current player tier status", () => {
  it("shows an outdated tier as a red exclamation mark", () => {
    expect(participants).toContain("player.tier_status");
    expect(participantsTable).toContain('"Ранг неактуален"');
    expect(participantsTable).toContain('"!"');
    expect(participantStyles).toContain(".participant-tier.outdated");
    expect(participantStyles).toContain("#d83d4f");
    expect(globalStyles).toContain(
      '@import "./styles/32-participant-tier-status.css";',
    );
  });

  it("shows inactive only to organizers and accepts exclamation input", () => {
    expect(participantsTable).toContain("participant-inactive-badge");
    expect(participantsTable).toContain("isOrganizer");
    expect(participantDialog).toContain('player.tierStatus === "current"');
    expect(participantDialog).toContain('pattern="!|[0-9]|1[0-2]"');
    expect(participantAdmin).toContain("tier_status = CASE");
    expect(participantAdmin).toContain("WHEN $2 THEN 'outdated'");
    expect(participantAdmin).toContain("ELSE 'current'");
    expect(participantAdmin).not.toContain("WHEN tier_status = 'inactive'");
    expect(participantDialog).toContain(
      "Любое числовое значение снимает",
    );
    expect(participantDialog).toContain("отметки ! и «Инактив».");
    expect(normalizeParticipantTierInput("!")).toEqual({
      isOutdated: true,
      numericTier: 0,
    });
    expect(normalizeParticipantTierInput("12")).toEqual({
      isOutdated: false,
      numericTier: 12,
    });
    expect(normalizeParticipantTierInput("13")).toBeNull();
  });

  it("blocks tournament applications containing outdated players", () => {
    expect(applicationSupport).toContain("tier_status");
    expect(applicationSupport).toContain("outdatedTierApplicationError");
    expect(applicationRoute).toContain("outdatedTierApplicationError");
    expect(tierStatusModel).toContain(
      "неактуальный тир, для актуализации пишите @frokeng",
    );
    const players: TierStatusApplicationPlayer[] = [
      {
        ingame_name: "Current",
        tier_status: "current",
      },
      {
        ingame_name: "Later",
        tier_status: "outdated",
      },
      {
        ingame_name: "Inactive",
        tier_status: "inactive",
      },
    ];
    expect(outdatedTierApplicationError(players)).toBe(
      "У игрока (-ов) Later, Inactive неактуальный тир, для актуализации пишите @frokeng",
    );
  });
});
