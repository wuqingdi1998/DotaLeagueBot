import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "../app/components/SiteHeader";
import { HeaderNavigationContext } from "../app/components/header/useHeaderNavigation";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe("header active section", () => {
  it.each([
    ["/season-lobby/123", "/tournaments"],
    ["/season-lobby/456/", "/tournaments"],
    ["/tournaments", "/tournaments"],
    ["/tournaments/season-nine", "/tournaments"],
    ["/season", "/season"],
    ["/season/", "/season"],
    ["/season/archive", "/season"],
    ["/", "/"],
    ["/calendar", "/calendar"],
  ])("highlights only %s's section in desktop and mobile menus", (pathname, href) => {
    navigation.pathname = pathname;
    const markup = renderToStaticMarkup(createElement(
      HeaderNavigationContext.Provider,
      { value: { beginNavigation: vi.fn(), cancelAnimation: vi.fn(), isMobileAnimation: true } },
      createElement(SiteHeader, { theme: "dark", setTheme: vi.fn(), user: null }),
    ));

    const menus = [...markup.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)];
    expect(menus).toHaveLength(2);
    for (const [, menu] of menus) {
      const activeLinks = [...menu.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
      expect(activeLinks).toHaveLength(1);
      expect(activeLinks[0][0]).toContain(`href="${href}"`);
    }
  });
});
