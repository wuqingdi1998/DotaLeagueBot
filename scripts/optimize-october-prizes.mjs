import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const projectRoot = new URL("../", import.meta.url);
const siteRoot = new URL("site/", projectRoot);
const require = createRequire(new URL("package.json", siteRoot));
const sharp = require("sharp");
const sourceModules = [
  "app/organizer/compendium-october/model/clan-prizes.ts",
  "app/compendium/model/october-star-race.ts",
];
const variants = {
  thumbnail: { size: 224, quality: 85 },
  preview: { size: 640, quality: 88 },
};
const outputDirectory = "/compendium/october/prizes/";
const manifest = {};
const sourcePaths = new Set();

for (const modulePath of sourceModules) {
  const source = await readFile(new URL(modulePath, siteRoot), "utf8");
  for (const match of source.matchAll(/"(\/compendium\/october\/[^"\s]+\.png)"/g)) {
    sourcePaths.add(match[1]);
  }
}

await mkdir(new URL(`public${outputDirectory}`, siteRoot), { recursive: true });

for (const sourcePath of [...sourcePaths].sort()) {
  const original = await readFile(new URL(`public${sourcePath}`, siteRoot));
  const stem = sourcePath.split("/").at(-1).replace(/\.png$/, "");
  manifest[sourcePath] = {};
  for (const [variant, { size, quality }] of Object.entries(variants)) {
    const image = await sharp(original)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality, alphaQuality: 100, effort: 6 })
      .toBuffer();
    const hash = createHash("sha256").update(image).digest("hex").slice(0, 12);
    const outputPath = `${outputDirectory}${stem}-${variant}-${hash}.webp`;
    await writeFile(new URL(`public${outputPath}`, siteRoot), image);
    manifest[sourcePath][variant] = outputPath;
  }
}

await writeFile(
  new URL("app/compendium/model/october-prize-images.generated.json", siteRoot),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Prepared thumbnail and preview images for ${sourcePaths.size} prize sources.`);
