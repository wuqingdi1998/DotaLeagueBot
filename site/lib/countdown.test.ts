import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dayCountLabel } from "./countdown";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

describe("tournament countdown", () => {
  it("uses the correct Russian day label for every value from 1 to 99", () => {
    for (let days = 1; days <= 99; days += 1) {
      const lastTwoDigits = days % 100;
      const lastDigit = days % 10;
      const expected =
        lastTwoDigits >= 11 && lastTwoDigits <= 14
          ? "дней"
          : lastDigit === 1
            ? "день"
            : lastDigit >= 2 && lastDigit <= 4
              ? "дня"
              : "дней";
      expect(dayCountLabel(days), `${days} ${expected}`).toBe(expected);
    }
  });

  it("keeps labels unbroken and reserves stable width for two digits", () => {
    expect(css).toMatch(
      /\.countdown\s*\{[^}]*grid-template-columns:\s*max-content max-content max-content;/,
    );
    expect(css).toMatch(
      /\.countdown span\s*\{[^}]*white-space:\s*nowrap;/,
    );
    expect(css).toMatch(
      /\.countdown strong\s*\{[^}]*width:\s*2ch;[^}]*font-variant-numeric:\s*tabular-nums;/,
    );
  });
});
