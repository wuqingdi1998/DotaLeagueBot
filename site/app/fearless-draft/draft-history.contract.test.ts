import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const history = source("app/fearless-draft/sections/DraftHistory.tsx");
const board = source("app/styles/51-fearless-draft-board.css");

describe("Fearless Draft history", () => {
  it("keeps a fixed scroll limit without a gap below the action list", () => {
    expect(activeDraft).toContain("radiantPlayerId={radiant.id}");
    expect(history).toContain('action.actorId === radiantPlayerId ? "radiant" : "dire"');
    expect(board).toMatch(
      /\.fearless-history\s*\{[^}]*display:\s*flex;[^}]*align-self:\s*start;[^}]*flex-direction:\s*column;/,
    );
    expect(board).toMatch(
      /\.fearless-history > div\s*\{[^}]*max-height:\s*575px;[^}]*overflow-y:\s*auto;/,
    );
    expect(board).toContain(".fearless-history article > span.radiant");
    expect(board).toContain(".fearless-history article > span.dire");
  });
});
