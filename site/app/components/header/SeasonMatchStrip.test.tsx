import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SeasonMatchStrip } from "./SeasonMatchStrip";

describe("season match strip", () => {
  it.each(["/", "/calendar", "/season-lobby/987"])(
    "links directly to the player's lobby from %s",
    (pathname) => {
      const markup = renderToStaticMarkup(createElement(SeasonMatchStrip, { matchId: 123, pathname }));
      expect(markup).toContain('href="/season-lobby/123"');
      expect(markup).toContain("Матч идёт");
      expect(markup).toContain("В лобби");
    },
  );

  it.each([
    [null, "/calendar"],
    [123, "/season-lobby/123"],
    [123, "/season-lobby/123/"],
  ] as const)("hides with match %s and path %s", (matchId, pathname) => {
    expect(renderToStaticMarkup(createElement(SeasonMatchStrip, { matchId, pathname }))).toBe("");
  });
});
