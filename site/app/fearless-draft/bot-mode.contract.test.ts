import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const queue = source("app/fearless-draft/sections/DraftQueue.tsx");
const route = source("app/api/fearless-draft/route.ts");
const botService = source("app/fearless-draft/server/bot-service.ts");
const snapshot = source("app/fearless-draft/server/snapshot-service.ts");
const migration = source("../bot/database/migrations/0070_fearless_draft_bot_and_toss_segments.sql");

describe("Fearless Draft organizer bot mode", () => {
  it("shows the Bot button only to an organizer", () => {
    expect(queue).toContain("snapshot.isOrganizer");
    expect(queue).toContain('{ action: "START_BOT" }');
    expect(queue).toContain("<FiCpu /> Bot");
    expect(snapshot).toContain("isOrganizer: user.isAdmin");
  });

  it("requires organizer rights on the server", () => {
    expect(route).toContain('case "START_BOT"');
    expect(route).toContain("if (!user.isAdmin)");
    expect(route).toContain("await startBotDraft(user.discordId)");
  });

  it("uses one hidden archived player and prevents concurrent bot series", () => {
    expect(migration).toContain("9223372036854775806");
    expect(migration).toContain("is_archived");
    expect(botService).toContain("hasActiveSeries(client, FEARLESS_DRAFT_BOT_PLAYER_ID)");
  });

  it("randomly resolves bot choices, picks and bans through normal draft rules", () => {
    expect(botService).toContain("randomAvailableHeroId");
    expect(botService).toContain("makeDraftChoice(FEARLESS_DRAFT_BOT_PLAYER_ID");
    expect(botService).toContain("selectDraftHero(");
    expect(botService).toContain("state.version");
    expect(botService).toContain("true,");
    expect(botService).toContain("runBotAction");
    expect(route).toContain("await advanceBotDraft(user.discordId)");
  });
});
