import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profileCustomizationCss = readFileSync(
  new URL("../app/styles/18-profile-customization.css", import.meta.url),
  "utf8",
);

describe("profile background editor layout", () => {
  it("stacks both crop panels on tablets", () => {
    expect(profileCustomizationCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.profile-background-crop-workspace\s*\{[^}]*grid-template-columns:\s*1fr;/,
    );
  });

  it("fits the editor and its actions on compact phones", () => {
    expect(profileCustomizationCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.profile-background-crop-backdrop\s*\{[^}]*align-items:\s*flex-start;[^}]*padding:\s*10px;/,
    );
    expect(profileCustomizationCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.profile-background-crop-actions\s*\{[^}]*flex-direction:\s*column-reverse;/,
    );
  });
});
