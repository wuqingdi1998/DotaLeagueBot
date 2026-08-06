import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const foundation = source("../app/styles/01-foundation.css");
const compendiumHeading = source("../app/styles/35-compendium-heading.css");
const compendiumRewards = source("../app/styles/38-compendium-rewards.css");
const compendiumPredictions = source(
  "../app/styles/39-compendium-predictions.css",
);
const compendiumRune = source(
  "../app/styles/42-compendium-rune-challenge.css",
);

describe("light theme contrast", () => {
  it("uses clearly dark primary, secondary and quiet text site-wide", () => {
    expect(foundation).toContain("--blue: #006b9f");
    expect(foundation).toContain("--blue-soft: #1c6687");
    expect(foundation).toContain("--text: #071f2f");
    expect(foundation).toContain("--muted: #294c61");
    expect(foundation).toContain("--quiet: #456578");
    expect(foundation).toContain("--blue-strong: #006a9e");
    expect(foundation).toMatch(
      /\.site-shell\[data-theme="dark"\][^{]*\{[^}]*--blue:\s*#00c3ff;[^}]*--blue-soft:\s*#79ddff;/,
    );
  });

  it("gives the compendium hero a light golden theme", () => {
    expect(compendiumHeading).toMatch(
      /\.site-shell\[data-theme="light"\] \.compendium-hero-section\s*\{[^}]*#fffaf0[^}]*#f2dfaa[^}]*color:\s*#3b2a08;/,
    );
    expect(compendiumHeading).toMatch(
      /\.site-shell\[data-theme="light"\] \.compendium-summary > div\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.72\);/,
    );
  });

  it("keeps pending reward text readable while still dimmed", () => {
    expect(compendiumRewards).toMatch(
      /\.site-shell\[data-theme="light"\] \.compendium-reward-milestones article\.locked\s*\{[^}]*opacity:\s*0\.72;[^}]*filter:\s*grayscale\(0\.65\) saturate\(0\.35\);/,
    );
    expect(compendiumRewards).toContain("color: #805300");
  });

  it("uses dark accents for predictions and rune challenges", () => {
    expect(compendiumPredictions).toContain("color: #176f69");
    expect(compendiumPredictions).toContain("color: #7a5100");
    expect(compendiumRune).toContain("color: #60409c");
  });
});
