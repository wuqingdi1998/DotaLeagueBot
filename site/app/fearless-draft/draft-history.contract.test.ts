import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const history = source("app/fearless-draft/sections/DraftHistory.tsx");
const draftTree = source("app/fearless-draft/components/DraftTree.tsx");
const draftTreeModel = source("app/fearless-draft/model/draft-tree.ts");
const board = source("app/styles/51-fearless-draft-board.css");
const treeStyles = source("app/styles/51-fearless-draft-history-tree.css");
const globalStyles = source("app/globals.css");

describe("Fearless Draft history", () => {
  it("matches the hero pool height and scrolls without stretching the board", () => {
    expect(activeDraft).toContain("radiantPlayerId={radiant.id}");
    expect(history).toContain('action.actorId === radiantPlayerId ? "radiant" : "dire"');
    expect(board).toMatch(
      /\.fearless-history\s*\{[^}]*display:\s*flex;[^}]*min-height:\s*0;[^}]*align-self:\s*stretch;[^}]*contain:\s*size;[^}]*flex-direction:\s*column;/,
    );
    expect(board).toMatch(
      /\.fearless-history > div\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*none;[^}]*flex:\s*1;[^}]*overflow-y:\s*auto;/,
    );
    expect(board).toContain(".fearless-history article > span.radiant");
    expect(board).toContain(".fearless-history article > span.dire");
  });

  it("scrolls to the latest row whenever an overflowing history grows", () => {
    expect(history).toContain('"use client"');
    expect(history).toContain("useEffect");
    expect(history).toContain("historyListRef");
    expect(history).toContain("historyList.scrollHeight > historyList.clientHeight");
    expect(history).toContain("historyList.scrollTop = historyList.scrollHeight");
    expect(history).toContain("[actions.length]");
  });

  it("replaces the fullscreen counter with History and Tree tabs", () => {
    expect(activeDraft).toContain("isFullscreen={isFullscreen}");
    expect(activeDraft).toContain("firstPickPlayerId={firstPick.id}");
    expect(history).toContain('useState<"history" | "tree">("history")');
    expect(history).toContain("История драфта");
    expect(history).toContain("Древо");
    expect(history).toContain("isFullscreen ? (");
    expect(history).toContain("{actions.length} / 24");
    expect(history).toContain("isFullscreen && activeView === \"tree\"");
    expect(treeStyles).toContain(":fullscreen .fearless-history-tabs");
  });

  it("builds all 24 tree steps from the current draft sequence", () => {
    expect(draftTree).toContain("buildDraftTreeRows");
    expect(draftTreeModel).toContain("DRAFT_SEQUENCE.map((sequenceStep, index)");
    expect(draftTreeModel).toContain("radiantSteps.map((radiant, index)");
    expect(draftTreeModel).toContain('sequenceStep.actor === "FIRST"');
    expect(draftTreeModel).toContain("firstPickPlayerId === radiantPlayerId");
    expect(draftTreeModel).toContain("action.actorId === radiantPlayerId");
    expect(draftTree).toContain('treeStep.type.toLowerCase()');
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-slot\.ban\s*\{[^}]*width:\s*64px;[^}]*aspect-ratio:\s*16 \/ 9;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-slot\.pick\s*\{[^}]*width:\s*88px;[^}]*aspect-ratio:\s*16 \/ 9;/,
    );
  });

  it.each([
    { viewportWidth: 1280, historyColumnWidth: 260 },
    { viewportWidth: 1920, historyColumnWidth: 260 },
    { viewportWidth: 3440, historyColumnWidth: 260 },
  ])(
    "fits both tree branches inside the history column at $viewportWidth px",
    ({ historyColumnWidth }) => {
      const treeInnerWidth = historyColumnWidth - 16;
      expect((88 * 2) + 30 + (18 * 2)).toBeLessThan(treeInnerWidth);
      expect(treeStyles).toContain(
        "grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr)",
      );
    },
  );

  it("aligns both slot columns by their inner edges and preserves full portraits", () => {
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-branch\.radiant\s*\{[^}]*justify-content:\s*flex-end;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-branch\.radiant\.active::after,[\s\S]*\.fearless-draft-tree-branch\.dire\.active::before\s*\{[^}]*flex:\s*0 0 18px;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-slot img\s*\{[^}]*object-fit:\s*contain;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-number\s*\{[^}]*font-size:\s*13px;/,
    );
  });

  it("renders all actions as 12 paired rows without a tree scrollbar", () => {
    expect(draftTree).toContain("draftTreeRows.map");
    expect(draftTree).toContain("fearless-draft-tree-numbers");
    expect(treeStyles).toContain(".fearless-history > .fearless-draft-tree");
    expect(treeStyles).toMatch(
      /\.fearless-history > \.fearless-draft-tree\s*\{[^}]*overflow-y:\s*hidden;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-row\.has-pick\s*\{[^}]*min-height:\s*52px;/,
    );
  });

  it("keeps step numbers chronological and connects each slot to its own level", () => {
    expect(draftTree).toContain("radiant.number < dire.number");
    expect(draftTree).toContain("earlierStep.number");
    expect(draftTree).toContain("laterStep.number");
    expect(draftTree).toContain('isRadiantEarlier ? "upper" : "lower"');
    expect(treeStyles).toContain("--tree-number-offset: 9px");
    expect(treeStyles).toContain("--tree-number-offset: 16px");
    expect(treeStyles).toContain("translateY(calc(-1 * var(--tree-number-offset)))");
    expect(treeStyles).toContain("translateY(var(--tree-number-offset))");
  });

  it("uses the full tree height while keeping every row inside the panel", () => {
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-row\s*\{[^}]*min-height:\s*37px;/,
    );
  });

  it("shows the local gray preview and current-stage shimmer in the tree", () => {
    expect(activeDraft).toContain("currentStep={map.currentStep}");
    expect(activeDraft).toContain("previewHeroId={localPreviewHeroId}");
    expect(history).toContain("currentStep={currentStep}");
    expect(history).toContain("previewHeroId={previewHeroId}");
    expect(draftTree).toContain('isCurrent ? "current-action"');
    expect(draftTree).toContain('previewHero ? "previewing"');
    expect(treeStyles).toContain("animation: fearless-current-slot-pulse");
    expect(treeStyles).toContain("animation: fearless-current-slot-shimmer");
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-slot\.previewing img\s*\{[^}]*grayscale\(1\)/,
    );
    expect(draftTree).not.toContain("<i>—</i>");
  });

  it("loads the isolated tree styles after the existing Fearless modules", () => {
    const interactionsImport = '@import "./styles/51-fearless-draft-interactions.css";';
    const treeImport = '@import "./styles/51-fearless-draft-history-tree.css";';
    expect(globalStyles).toContain(treeImport);
    expect(globalStyles.indexOf(treeImport)).toBeGreaterThan(
      globalStyles.indexOf(interactionsImport),
    );
  });
});
