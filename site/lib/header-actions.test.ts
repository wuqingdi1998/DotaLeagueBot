import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const component = readFileSync(
  new URL("../app/components/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const headerCss = readFileSync(
  new URL("../app/styles/02-site-header.css", import.meta.url),
  "utf8",
);
const actionCompaction = readFileSync(
  new URL(
    "../app/components/header/useHeaderActionCompaction.ts",
    import.meta.url,
  ),
  "utf8",
);
const css = loadSiteStyles();

describe("site header actions", () => {
  it("places Boosty between the mobile menu and theme controls", () => {
    const actions = component.slice(
      component.indexOf('className="header-actions"'),
      component.indexOf("{user ? ("),
    );

    expect(actions.indexOf("mobile-menu-button")).toBeLessThan(
      actions.indexOf("boosty-button"),
    );
    expect(actions.indexOf("boosty-button")).toBeLessThan(
      actions.indexOf("theme-button"),
    );
    expect(actions).toContain("https://boosty.to/linkenssphere");
  });

  it("uses a generic login icon on mobile and Discord icon on desktop", () => {
    expect(component).toContain('className="login-icon-discord"');
    expect(component).toContain('className="login-icon-mobile"');
    expect(component).toContain('aria-label="Войти через Discord"');
    expect(css).toMatch(
      /\.login-icon-mobile\s*\{[^}]*display:\s*none;/,
    );
    expect(css).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.login-icon-discord\s*\{[^}]*display:\s*none;[\s\S]*\.login-icon-mobile\s*\{[^}]*display:\s*block;/,
    );
  });

  it("collapses Boosty to an icon-sized mobile button", () => {
    expect(css).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.boosty-button\s*\{[^}]*width:\s*46px;[^}]*padding:\s*0;/,
    );
    expect(css).toMatch(
      /\.boosty-button span\s*\{[^}]*display:\s*none;/,
    );
  });

  it("compacts organizer, Boosty, and profile actions in that order on desktop", () => {
    expect(actionCompaction).toContain(
      'const desktopNavigationQuery = "(min-width: 1051px)"',
    );
    expect(actionCompaction).toContain(
      "window.matchMedia(desktopNavigationQuery)",
    );
    expect(actionCompaction).toContain("navigationRect.right > actionRect.left");
    expect(actionCompaction.indexOf("compactOrganizer")).toBeLessThan(
      actionCompaction.indexOf("compactBoosty"),
    );
    expect(actionCompaction.indexOf("compactBoosty")).toBeLessThan(
      actionCompaction.indexOf("compactProfile"),
    );
    expect(headerCss).toMatch(
      /\[data-compact-organizer="true"\][\s\S]*\.organizer-menu-button\s*\{[^}]*width:\s*46px;[^}]*padding:\s*0;/,
    );
    expect(headerCss).toMatch(
      /\[data-compact-boosty="true"\][\s\S]*\.boosty-button\s*\{[^}]*width:\s*46px;[^}]*padding:\s*0;/,
    );
    expect(headerCss).toMatch(
      /\[data-compact-profile="true"\][\s\S]*\.player-profile-button\s*\{[^}]*width:\s*46px;/,
    );
    expect(headerCss).toMatch(
      /\[data-compact-profile="true"\] \.player-profile-button\s*\{[^}]*padding:\s*3px;/,
    );
    expect(headerCss).not.toMatch(
      /@media \(min-width:\s*761px\) and \(max-width:\s*1800px\)/,
    );
    expect(headerCss).not.toContain(
      '.header-actions[data-compact-boosty="true"] .theme-button',
    );
    expect(headerCss).not.toContain(
      '.header-actions[data-compact-profile="true"] .theme-button',
    );
    expect(headerCss).toMatch(
      /\.header-actions > \*\s*\{[^}]*flex:\s*0 0 auto;/,
    );
    expect(component).toContain("Открыть меню профиля");
  });

  it("reduces the full server-name text for long profile names", () => {
    expect(component).toContain("longProfileNameLength");
    expect(component).toContain("has-long-name");
    expect(headerCss).toMatch(
      /\.player-profile-button\.has-long-name \.player-profile-copy strong\s*\{[^}]*font-size:\s*13px;/,
    );
  });
});
