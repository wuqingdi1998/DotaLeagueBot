import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const activeDraft = source("app/fearless-draft/sections/ActiveDraft.tsx");
const draftScreen = source("app/fearless-draft/FearlessDraftScreen.tsx");
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

  it("opens the Tree first and keeps both expanded tab labels inside", () => {
    expect(activeDraft).toContain("isFullscreen={isFullscreen}");
    expect(activeDraft).toContain("firstPickPlayerId={firstPick.id}");
    expect(history).toContain('useState<"history" | "tree">("tree")');
    expect(history).toContain("{text.history}");
    expect(history).toContain("{text.tree}");
    expect(history.indexOf("{text.tree}")).toBeLessThan(
      history.indexOf("{text.history}"),
    );
    expect(history).not.toContain("isTreeAvailable");
    expect(history).toContain('activeView === "tree" ? (');
    expect(treeStyles).toContain(".fearless-history-tabs");
    expect(treeStyles).toContain(
      "grid-template-columns: minmax(88px, 2fr) minmax(124px, 3fr)",
    );
    expect(treeStyles).toMatch(
      /\.fearless-history-tabs\s*\{[^}]*border:\s*1px solid var\(--line-strong\);/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-history-tabs button\s*\{[^}]*overflow:\s*hidden;[^}]*text-align:\s*center;[^}]*white-space:\s*nowrap;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-history-tabs button\.active\s*\{[^}]*box-shadow:\s*inset 0 -2px var\(--blue\);/,
    );
  });

  it("uses one tree implementation on the standalone page and inside a season lobby", () => {
    expect(draftScreen).toContain('className="fearless-draft-stage"');
    expect(draftScreen).not.toContain("season-lobby-embedded");
    expect(activeDraft).not.toContain("isEmbeddedLobby");
    expect(activeDraft).not.toContain("isTreeAvailable");
    expect(activeDraft.indexOf("<HeroGrid")).toBeLessThan(
      activeDraft.indexOf("<DraftHistory"),
    );
    expect(history).toContain('activeView === "tree"');
    expect(history).toContain("<DraftTree");
    expect(treeStyles).toMatch(
      /@media \(max-width: 980px\)[\s\S]*\.fearless-draft-stage \.fearless-history > \.fearless-draft-tree\s*\{[^}]*max-height:\s*none;/,
    );
  });

  it("builds all 24 tree steps from the current draft sequence", () => {
    expect(draftTree).toContain("buildDraftTreeRows");
    expect(draftTreeModel).toContain("DRAFT_SEQUENCE.map((sequenceStep, index)");
    expect(draftTreeModel).toContain("currentStep.isRadiant !== nextStep?.isRadiant");
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
      expect((88 * 2) + 30 + (12 * 2)).toBeLessThan(treeInnerWidth);
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
      /\.fearless-draft-tree-branch\.radiant\.active::after,[\s\S]*\.fearless-draft-tree-branch\.dire\.active::before\s*\{[^}]*flex:\s*0 0 calc\(12px \+ var\(--tree-line-overlap\)\);/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-slot img\s*\{[^}]*object-fit:\s*contain;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-number\s*\{[^}]*font-size:\s*13px;/,
    );
  });

  it("renders all actions as compact ordered rows without a tree scrollbar", () => {
    expect(draftTree).toContain("draftTreeRows.map");
    expect(draftTree).toContain("fearless-draft-tree-numbers");
    expect(draftTree).toContain('laterStep ? "upper" : "middle"');
    expect(treeStyles).toContain(".fearless-history > .fearless-draft-tree");
    expect(treeStyles).toMatch(
      /\.fearless-history > \.fearless-draft-tree\s*\{[^}]*overflow-y:\s*hidden;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-row\.has-pick\s*\{[^}]*min-height:\s*52px;/,
    );
  });

  it("keeps step numbers chronological and connects each slot to its own level", () => {
    expect(draftTree).toContain("rowSteps.sort");
    expect(draftTree).toContain("earlierStep.number");
    expect(draftTree).toContain("laterStep.number");
    expect(treeStyles).toContain(".fearless-draft-tree-number.middle");
    expect(treeStyles).toContain("--tree-number-offset: 9px");
    expect(treeStyles).toContain("--tree-number-offset: 16px");
    expect(treeStyles).toContain("translateY(calc(-1 * var(--tree-number-offset)))");
    expect(treeStyles).toContain("translateY(var(--tree-number-offset))");
  });

  it("keeps the three opening bans of the first-pick side evenly spaced", () => {
    expect(draftTree).toContain('treeStep.number === 4 ? "opening-ban-spacing" : ""');
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-slot\.opening-ban-spacing\s*\{[^}]*transform:\s*translateY\(20px\);/,
    );
  });

  it("leaves exactly two pixels between every connector and its number", () => {
    expect(draftTree).toContain('number >= 10 ? "double-digit" : "single-digit"');
    expect(treeStyles).toContain("--tree-line-number-gap: 2px");
    expect(treeStyles).toContain("--tree-number-half-width: 0.5ch");
    expect(treeStyles).toContain("--tree-number-half-width: 1ch");
    expect(treeStyles).toContain(
      "--tree-line-overlap: calc(15px - var(--tree-number-half-width) - var(--tree-line-number-gap))",
    );
  });

  it("uses larger one-line side headings", () => {
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-sides span\s*\{[^}]*font-size:\s*13px;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-sides span:first-child\s*\{[^}]*width:\s*calc\(64px \+ 12px\);[^}]*justify-self:\s*end;[^}]*text-align:\s*left;/,
    );
  });

  it("uses the full tree height while keeping every row inside the panel", () => {
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;/,
    );
    expect(treeStyles).toMatch(
      /\.fearless-draft-tree-row\s*\{[^}]*min-height:\s*37px;/,
    );
  });

  it("fits every draft step into the non-fullscreen board height", () => {
    expect(treeStyles).toMatch(
      /\.fearless-draft-stage:not\(:fullscreen\) \.fearless-draft-tree\s*\{[^}]*padding:\s*5px 6px 6px;/,
    );
    expect(treeStyles).toMatch(
      /@media \(min-width: 981px\)[\s\S]*\.fearless-draft-stage:not\(:fullscreen\) \.fearless-draft-tree-row\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1 1 0;/,
    );
    expect(treeStyles).toMatch(
      /@media \(min-width: 981px\)[\s\S]*\.fearless-draft-stage:not\(:fullscreen\) \.fearless-draft-tree-row\.has-pick\s*\{[^}]*min-height:\s*0;[^}]*flex-grow:\s*1\.35;/,
    );
    expect(treeStyles).toMatch(
      /@media \(min-width: 981px\)[\s\S]*\.fearless-draft-stage:not\(:fullscreen\) \.fearless-draft-tree-slot\.ban\s*\{[^}]*width:\s*auto;[^}]*height:\s*min\(calc\(100% - 2px\), 32px\);/,
    );
    expect(treeStyles).toMatch(
      /@media \(min-width: 981px\)[\s\S]*\.fearless-draft-stage:not\(:fullscreen\) \.fearless-draft-tree-slot\.pick\s*\{[^}]*width:\s*auto;[^}]*height:\s*min\(calc\(100% - 2px\), 42px\);/,
    );
    expect(treeStyles).toMatch(
      /@media \(max-width: 980px\)[\s\S]*\.fearless-draft-stage:not\(:fullscreen\) \.fearless-draft-tree-row\s*\{[^}]*min-height:\s*32px;/,
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
