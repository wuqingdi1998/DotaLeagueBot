import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function collectFiles(directory: URL, extension: RegExp): URL[] {
  return readdirSync(directory, { encoding: "utf8" }).flatMap((entry) => {
    const path = new URL(
      entry,
      directory.href.endsWith("/") ? directory : new URL(`${directory.href}/`),
    );
    if (statSync(fileURLToPath(path)).isDirectory()) {
      return collectFiles(new URL(`${path.href}/`), extension);
    }
    return extension.test(entry) ? [path] : [];
  });
}

function lineCount(file: URL) {
  return readFileSync(file, "utf8").trimEnd().split(/\r?\n/).length;
}

describe("architecture boundaries", () => {
  it("keeps all site code files at or below 500 lines", () => {
    const files = [
      ...collectFiles(new URL("../app", import.meta.url), /\.(ts|tsx)$/),
      ...collectFiles(new URL(".", import.meta.url), /\.(ts|tsx)$/),
      ...collectFiles(new URL("../extensions", import.meta.url), /\.ts$/),
      ...collectFiles(new URL("../scripts", import.meta.url), /\.mjs$/),
    ];
    const oversized = files
      .map((file) => ({
        file: fileURLToPath(file),
        lines: lineCount(file),
      }))
      .filter(({ lines }) => lines > 500);

    expect(oversized).toEqual([]);
  });

  it("keeps every stylesheet at or below 500 lines", () => {
    const files = collectFiles(
      new URL("../app/styles", import.meta.url),
      /\.css$/,
    );
    const oversized = files
      .map((file) => ({
        file: fileURLToPath(file),
        lines: lineCount(file),
      }))
      .filter(({ lines }) => lines > 500);

    expect(oversized).toEqual([]);
  });

  it("keeps the route entry focused on composition", () => {
    const route = new URL(
      "../app/tournaments/[slug]/page.tsx",
      import.meta.url,
    );
    expect(lineCount(route)).toBeLessThanOrEqual(50);
  });
});
