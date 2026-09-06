import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { zipSync, strToU8 } from "fflate";

const root = new URL("../", import.meta.url);
const identity = JSON.parse(await readFile(new URL("extensions/dotabuff/identity.json", root), "utf8"));
const hash = createHash("sha256").update(Buffer.from(identity.key, "base64")).digest("hex").slice(0, 32);
const extensionId = [...hash].map((character) => String.fromCharCode(97 + Number.parseInt(character, 16))).join("");
if (extensionId !== identity.id) throw new Error("Dotabuff extension ID does not match its public key");
const manifest = {
  manifest_version: 3,
  name: "Linken's Sphere · Dotabuff",
  version: identity.version,
  description: "Победы по ролям из вашей вкладки Dotabuff для организатора Linken's Sphere.",
  key: identity.key,
  minimum_chrome_version: "102",
  permissions: ["storage"],
  background: { service_worker: "background.js" },
  content_scripts: [{ matches: ["https://www.dotabuff.com/players/*/matches*"], js: ["content.js"], run_at: "document_idle" }],
  externally_connectable: { matches: ["https://lsesports.ru/*"] },
};
const files = { "manifest.json": strToU8(JSON.stringify(manifest, null, 2)) };
for (const entry of ["background", "content"]) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(`extensions/dotabuff/${entry}.ts`, root))],
    bundle: true, write: false, platform: "browser", format: "iife", target: "chrome102", legalComments: "none" });
  files[`${entry}.js`] = result.outputFiles[0].contents;
}
files["README.txt"] = new Uint8Array(await readFile(new URL("extensions/dotabuff/README.txt", root)));
const output = new URL(".data/dotabuff-extension/", root);
await mkdir(output, { recursive: true });
for (const [name, content] of Object.entries(files)) await writeFile(new URL(name, output), content);
await mkdir(new URL("public/downloads/", root), { recursive: true });
await writeFile(new URL("public/downloads/linkens-dotabuff-helper.zip", root), zipSync(files));
console.log(`Dotabuff extension ${identity.version}: ${extensionId}`);
