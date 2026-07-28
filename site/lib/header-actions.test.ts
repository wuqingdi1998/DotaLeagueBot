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
const css = loadSiteStyles();

describe("site header actions", () => {
  it("places Boosty between the mobile menu and theme controls", () => {
    const actions = component.slice(
      component.indexOf('<div className="header-actions">'),
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

  it("compacts header actions before they can overlap on narrow desktops", () => {
    expect(headerCss).toMatch(
      /@media \(min-width:\s*761px\) and \(max-width:\s*1400px\)[\s\S]*\.boosty-button,[\s\S]*\.theme-button,[\s\S]*\.discord-login,[\s\S]*\.player-profile-button\s*\{[^}]*width:\s*46px;[^}]*min-width:\s*46px;[^}]*height:\s*46px;/,
    );
    expect(headerCss).toMatch(
      /@media \(min-width:\s*761px\) and \(max-width:\s*1400px\)[\s\S]*\.login-icon-discord\s*\{[^}]*display:\s*none;[\s\S]*\.login-icon-mobile\s*\{[^}]*display:\s*block;/,
    );
    expect(headerCss).toMatch(
      /\.header-actions > \*\s*\{[^}]*flex:\s*0 0 auto;/,
    );
    expect(component).toContain("Открыть меню профиля");
  });
});
