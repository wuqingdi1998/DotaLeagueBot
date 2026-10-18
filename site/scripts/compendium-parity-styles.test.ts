import { expect, it } from "vitest";
import { visualStyleDifferences } from "./compendium-parity-styles";

const style = (css: Record<string, string> = {}, before: Record<string, string> = {}, after: Record<string, string> = {}) => ({ className: "card", css, before, after });

it("compares empty and absent computed properties as the browser does", () => {
  const reference = style({ color: "red", "--lightningcss-light": "" }, { "--lightningcss-dark": "" });
  const actual = style({ color: "red" }, {}, { "--lightningcss-light": "" });
  expect(visualStyleDifferences([reference], [actual])).toEqual([]);
  expect(visualStyleDifferences([actual], [reference])).toEqual([]);
});

it("detects real changes and additional nonempty properties in either view, including pseudo-elements", () => {
  const reference = style({ color: "red", "--accent": "gold" }, { content: '"A"' });
  const actual = style({ color: "blue", "--extra": "silver" }, { content: '"B"' }, { color: "green" });
  const differences = visualStyleDifferences([reference], [actual]);
  expect(differences.map(({ part, property }) => [part, property])).toEqual([
    ["css", "color"], ["css", "--accent"], ["css", "--extra"], ["before", "content"], ["after", "color"],
  ]);
  expect(visualStyleDifferences([actual], [reference])).toHaveLength(5);
});
