import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldPreventSpaceScroll } from "../app/components/PreventSpaceScroll";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const layout = source("app/layout.tsx");
const prevention = source("app/components/PreventSpaceScroll.tsx");

describe("site-wide space key scrolling", () => {
  const plainSpaceKey = {
    altKey: false,
    code: "Space",
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
  };

  it("prevents the browser from scrolling pages with the space key", () => {
    expect(layout).toContain("<PreventSpaceScroll />");
    expect(prevention).toContain("event.preventDefault()");
    expect(shouldPreventSpaceScroll(plainSpaceKey, false)).toBe(true);
  });

  it("does not intercept other keys, shortcuts, or handled events", () => {
    expect(
      shouldPreventSpaceScroll({ ...plainSpaceKey, code: "Enter" }, false),
    ).toBe(false);
    expect(
      shouldPreventSpaceScroll({ ...plainSpaceKey, ctrlKey: true }, false),
    ).toBe(false);
    expect(
      shouldPreventSpaceScroll({ ...plainSpaceKey, metaKey: true }, false),
    ).toBe(false);
    expect(
      shouldPreventSpaceScroll({ ...plainSpaceKey, altKey: true }, false),
    ).toBe(false);
    expect(
      shouldPreventSpaceScroll(
        { ...plainSpaceKey, defaultPrevented: true },
        false,
      ),
    ).toBe(false);
  });

  it("preserves the space key behavior of editable and interactive controls", () => {
    expect(prevention).toContain('"input"');
    expect(prevention).toContain('"textarea"');
    expect(prevention).toContain('"button"');
    expect(prevention).toContain('"[contenteditable]:not([contenteditable=\'false\'])"');
    expect(prevention).toContain("shouldKeepSpaceKeyDefault(event.target)");
    expect(shouldPreventSpaceScroll(plainSpaceKey, true)).toBe(false);
  });
});
