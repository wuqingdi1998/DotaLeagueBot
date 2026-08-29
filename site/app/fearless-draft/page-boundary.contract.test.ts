import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const screen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const boundaryHook = source(
  "app/fearless-draft/hooks/useActiveDraftPageBoundary.ts",
);
const styles = source("app/styles/51-fearless-draft-page-boundary.css");
const globalStyles = source("app/globals.css");

describe("Fearless Draft page boundary", () => {
  it("enables the document boundary only while a draft series is open", () => {
    expect(screen).toContain("useActiveDraftPageBoundary(Boolean(series))");
    expect(boundaryHook).toContain(
      'ACTIVE_DRAFT_DOCUMENT_CLASS = "fearless-active-draft-document"',
    );
    expect(boundaryHook).toContain("document.body.classList.add(ACTIVE_DRAFT_DOCUMENT_CLASS)");
    expect(boundaryHook).toContain("document.body.classList.remove(ACTIVE_DRAFT_DOCUMENT_CLASS)");
  });

  it("ends either host page at the complete draft without locking scroll", () => {
    expect(globalStyles).toContain(
      '@import "./styles/51-fearless-draft-page-boundary.css";',
    );
    expect(styles).toMatch(
      /body\.fearless-active-draft-document \.platform-shell\s*\{[^}]*min-height:\s*0;/,
    );
    expect(styles).toMatch(
      /body\.fearless-active-draft-document \.platform-footer\s*\{[^}]*display:\s*none;/,
    );
    expect(styles).toMatch(
      /body\.fearless-active-draft-document \.fearless-draft-page\s*\{[^}]*min-height:\s*0;[^}]*padding-bottom:\s*0;/,
    );
    expect(styles).toMatch(
      /body\.fearless-active-draft-document \.season-room-page\s*\{[^}]*padding-bottom:\s*0;/,
    );
    expect(styles).not.toMatch(
      /body\.fearless-active-draft-document\s*\{[^}]*overflow[^}]*hidden/,
    );
  });
});
