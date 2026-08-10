import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const foundation = readFileSync(
  new URL("../app/styles/01-foundation.css", import.meta.url),
  "utf8",
);
const tournamentApplications = readFileSync(
  new URL("../app/styles/16-tournament-match-admin.css", import.meta.url),
  "utf8",
);

function colorVariables(declarations: string) {
  return new Map(
    [...declarations.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(
      ([, name, value]) => [name, value],
    ),
  );
}

function themeDeclarations(selector: RegExp) {
  const match = foundation.match(selector);
  if (!match) throw new Error("Не найдены цвета темы в 01-foundation.css");
  return colorVariables(match[1]);
}

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string) {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => channel(Number.parseInt(value, 16)));
  if (!channels) throw new Error(`Некорректный цвет: ${color}`);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const lightTheme = themeDeclarations(
  /\.site-shell,\s*\.loading-screen,\s*\.error-screen,\s*\.setup-screen\s*\{([\s\S]*?)\n\}/,
);
const darkOverrides = themeDeclarations(
  /\.site-shell\[data-theme="dark"\],[\s\S]*?\.setup-screen\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/,
);
const darkTheme = new Map([...lightTheme, ...darkOverrides]);

const foregrounds = [
  "text",
  "muted",
  "quiet",
  "blue",
  "blue-strong",
  "blue-deep",
];
const backgrounds = [
  "bg",
  "surface",
  "surface-soft",
  "surface-blue",
  "surface-violet",
];

describe("theme text contrast", () => {
  it.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ])("keeps shared text colors readable in the %s theme", (_, theme) => {
    for (const foregroundName of foregrounds) {
      for (const backgroundName of backgrounds) {
        const foreground = theme.get(foregroundName);
        const background = theme.get(backgroundName);
        expect(
          contrast(String(foreground), String(background)),
          `${foregroundName} on ${backgroundName}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps disabled application actions visibly readable", () => {
    const disabledRule = tournamentApplications.match(
      /\.application-actions button:disabled\s*\{([\s\S]*?)\}/,
    )?.[1];
    expect(disabledRule).toContain("background: var(--surface-soft)");
    expect(disabledRule).toContain("color: var(--quiet)");
    expect(disabledRule).not.toContain("opacity:");
  });
});
