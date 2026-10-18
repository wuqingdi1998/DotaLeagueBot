import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import TestLink from "./link";

it("keeps the inert fragment so a disabled result counter retains the main link appearance", () => {
  const html = renderToStaticMarkup(<TestLink href="#">Результат</TestLink>);
  expect(html).toContain('href="#"');
  expect(html).toContain('aria-disabled="true"');
});

it.each(["/compendium/star-race", "/players/example", "https://example.com"])("removes the navigation destination %s", (href) => {
  const html = renderToStaticMarkup(<TestLink href={href}>Результат</TestLink>);
  expect(html).not.toContain("href=");
  expect(html).toContain('aria-disabled="true"');
});
