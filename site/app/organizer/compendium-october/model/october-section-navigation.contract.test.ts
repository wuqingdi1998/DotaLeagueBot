import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewStyles = readFileSync(
  new URL("../../../styles/66-october-compendium-screens.css", import.meta.url),
  "utf8",
);
const sectionNavigationSource = readFileSync(
  new URL("../components/OctoberSectionNavigation.tsx", import.meta.url),
  "utf8",
);

describe("October desktop section navigation", () => {
  it("switches between four full screens without a visible scrollbar", () => {
    expect(previewStyles).toContain(".october-compendium-preview::-webkit-scrollbar");
    expect(previewStyles).toMatch(/\.october-compendium-preview\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*none;[^}]*scroll-snap-type:\s*y mandatory;/);
    expect(previewStyles).toMatch(/\.october-compendium-screen\s*\{[^}]*height:\s*calc\(100dvh - 76px\);[^}]*overflow:\s*hidden;[^}]*scroll-snap-align:\s*start;/);
    expect(previewStyles).toContain("scroll-snap-stop: always");
    expect(sectionNavigationSource).toContain('addEventListener("wheel"');
    expect(sectionNavigationSource).toContain('addEventListener("keydown"');
    expect(sectionNavigationSource).toContain("window.matchMedia(DESKTOP_PAGING_QUERY)");
  });

  it("does not switch background screens while a standings dialog is open", () => {
    expect(sectionNavigationSource).toContain(
      'document.querySelector(".october-clan-standing-dialog[open]")',
    );
    expect(sectionNavigationSource).toMatch(
      /function handleWheel\(event: WheelEvent\) \{\s+if \(isCompendiumDialogOpen\(\)\) return;/,
    );
    expect(sectionNavigationSource).toMatch(
      /function handleKeyDown\(event: KeyboardEvent\) \{\s+if \(isCompendiumDialogOpen\(\)\) return;/,
    );
  });
});
