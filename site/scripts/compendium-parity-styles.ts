type VisualStyle = {
  className: string | null;
  css: Record<string, string>;
  before: Record<string, string>;
  after: Record<string, string>;
};

export function visualStyleDifferences(main: VisualStyle[], test: VisualStyle[]) {
  return main.flatMap((element, index) => (["css", "before", "after"] as const).flatMap((part) => {
    const reference = element[part];
    const actual = test[index]?.[part] ?? {};
    return [...new Set([...Object.keys(reference), ...Object.keys(actual)])]
      // CSSStyleDeclaration.getPropertyValue returns "" for absent properties too.
      .filter((property) => (reference[property] ?? "") !== (actual[property] ?? ""))
      .map((property) => ({ index, className: element.className, part, property, main: reference[property] ?? "", test: actual[property] ?? "" }));
  }));
}
