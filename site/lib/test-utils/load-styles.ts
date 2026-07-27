import { readFileSync, readdirSync } from "node:fs";

export function loadSiteStyles() {
  const stylesDirectory = new URL("../../app/styles", import.meta.url);
  const featureStyles = readdirSync(stylesDirectory, { encoding: "utf8" })
    .filter((entry) => entry.endsWith(".css"))
    .sort()
    .map((entry) =>
      readFileSync(new URL(`../../app/styles/${entry}`, import.meta.url), "utf8"),
    );

  return [
    readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8"),
    ...featureStyles,
  ].join("\n");
}
