import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const localeHook = source("app/fearless-draft/hooks/useDraftLocale.tsx");
const translations = source("app/fearless-draft/model/i18n.ts");
const screen = source("app/fearless-draft/FearlessDraftScreen.tsx");
const fullscreenToggle = source("app/fearless-draft/components/DraftFullscreenToggle.tsx");
const board = source("app/styles/51-fearless-draft-board.css");
const viewToggles = source("app/styles/51-fearless-draft-view-toggles.css");

const localizedScreens = [
  "app/fearless-draft/FearlessDraftScreen.tsx",
  "app/fearless-draft/components/DraftCoinToss.tsx",
  "app/fearless-draft/components/DraftTeamPanel.tsx",
  "app/fearless-draft/components/DraftTree.tsx",
  "app/fearless-draft/components/HeroGrid.tsx",
  "app/fearless-draft/sections/ActiveDraft.tsx",
  "app/fearless-draft/sections/DraftAgreementPanel.tsx",
  "app/fearless-draft/sections/DraftChoices.tsx",
  "app/fearless-draft/sections/DraftHistory.tsx",
  "app/fearless-draft/sections/DraftQueue.tsx",
];

describe("Fearless Draft language switch", () => {
  it("starts in Russian and keeps one shared locale for every draft stage", () => {
    expect(localeHook).toContain('useState<DraftLocale>("ru")');
    expect(localeHook).toContain("DraftLocaleProvider");
    expect(screen).toContain("<DraftLocaleProvider>");
    expect(screen).toContain("</DraftLocaleProvider>");
  });

  it("keeps Ukrainian hidden behind twenty rapid language toggles", () => {
    expect(localeHook).toContain("registerDraftLanguageToggle");
    expect(localeHook).toContain("recentToggleTimesRef");
    expect(localeHook).toContain("toggleLocale");
    expect(fullscreenToggle).toContain("onClick={toggleLocale}");
    expect(fullscreenToggle).not.toContain(">UK<");
  });

  it("shows an RU/ENG switch directly below the fullscreen switch", () => {
    expect(fullscreenToggle).toContain("fearless-display-toggles");
    expect(fullscreenToggle).toContain("fearless-language-toggle");
    expect(fullscreenToggle).toContain(">RU<");
    expect(fullscreenToggle).toContain(">ENG<");
    expect(fullscreenToggle).toContain('locale === "ru" ? "active"');
    expect(fullscreenToggle).toContain('locale === "en" ? "active"');
    expect(viewToggles).toMatch(
      /\.fearless-display-toggles\s*\{[^}]*flex-direction:\s*column;/,
    );
    expect(viewToggles).toMatch(
      /\.fearless-display-toggles\s*\{[^}]*width:\s*148px;/,
    );
    expect(viewToggles).toMatch(
      /\.fearless-fullscreen-toggle,[\s\S]*?\.fearless-language-toggle\s*\{[^}]*grid-template-columns:\s*15px 34px minmax\(0, 1fr\);/,
    );
    expect(viewToggles).toMatch(
      /\.fearless-language-toggle em \.active\s*\{[^}]*text-decoration:\s*underline;/,
    );
  });

  it("provides Russian and English labels from one typed dictionary", () => {
    expect(translations).toContain("DRAFT_TRANSLATIONS");
    expect(translations).toContain('fullscreen: "На полный экран"');
    expect(translations).toContain('fullscreen: "Fullscreen"');
    expect(translations).toContain('fullscreen: "На весь екран"');
    expect(translations).toContain('history: "История драфта"');
    expect(translations).toContain('history: "Draft history"');
    expect(translations).toContain('heroPool: "ПУЛ ГЕРОЕВ"');
    expect(translations).toContain('heroPool: "HERO POOL"');
    expect(translations).toContain('heroPool: "ПУЛ ГЕРОЇВ"');
    expect(translations).toContain("translateDraftError");
  });

  it.each(localizedScreens)("uses the shared locale in %s", (path) => {
    expect(source(path)).toContain("useDraftLocale");
  });

  it("keeps hero names, player names and Bo formats unchanged", () => {
    const heroGrid = source("app/fearless-draft/components/HeroGrid.tsx");
    const queue = source("app/fearless-draft/sections/DraftQueue.tsx");
    const choices = source("app/fearless-draft/sections/DraftChoices.tsx");
    expect(heroGrid).toContain("selectedHero.name");
    expect(heroGrid).toContain("heroPreview.hero.name");
    expect(queue).toContain("invitation.format");
    expect(queue).toContain('["BO2", "BO3"]');
    expect(choices).toContain("decisionPlayer.name");
  });

  it("reserves the same space for the Bans label in both languages", () => {
    expect(board).toMatch(
      /\.fearless-ban-list > span\s*\{[^}]*width:\s*27px;[^}]*flex:\s*0 0 27px;/,
    );
  });

  it("keeps Ukrainian team headings on the same single line", () => {
    expect(board).toMatch(
      /\.fearless-team-panel > header span\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/,
    );
  });
});
