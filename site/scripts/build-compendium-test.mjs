import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/compendium-test/", root);
mkdirSync(directory, { recursive: true });
const runtime = new URL("app/compendium/test/runtime/", root);
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root), ...Object.fromEntries(["image", "link", "navigation"].map((name) => [`next/${name}`, fileURLToPath(new URL(`${name}.${name === "navigation" ? "ts" : "tsx"}`, runtime))])) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [{ name: "enforce-compendium-test-isolation", generateBundle() {
    const modules = [...this.getModuleIds()].map((id) => id.replaceAll("\\", "/"));
    const forbidden = modules.filter((id) => /\/app\/.*\/services\//.test(id) || /\/lib\/(db|auth|site-request|logout-action)\./.test(id) || /\/(pg|postgres)\//.test(id) || id.includes("useOctoberGuideVisibility"));
    if (forbidden.length) this.error(`Test bundle contains live services: ${forbidden.join(", ")}`);
    writeFileSync(new URL("modules.json", directory), JSON.stringify(modules.filter((id) => !id.includes("node_modules")), null, 2));
  } }],
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("entry.tsx", runtime)), formats: ["iife"], name: "CompendiumTest", fileName: () => "sandbox.js" } },
});
const styles = new URL("app/styles/", root);
const globalNames = [...readFileSync(new URL("app/globals.css", root), "utf8").matchAll(/@import "\.\/styles\/(.*?)";/g)].map((match) => match[1]);
const names = [...globalNames, ...[...readFileSync(new URL("compendium-route.css", styles), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1]), "72-compendium-test.css"];
const css = [readFileSync(new URL("node_modules/tailwindcss/preflight.css", root), "utf8"), ...names.map((name) => readFileSync(new URL(name, styles), "utf8"))].join("\n").replace(/url\(["']?(\/fonts\/[^)"']+)["']?\)/g, (_, path) => `url("data:font/ttf;base64,${readFileSync(new URL(`public${path}`, root)).toString("base64")}")`);
const script = readFileSync(new URL("bundle/sandbox.js", directory), "utf8").replace(/<\/script/gi, "<\\/script").replaceAll("__TEST_BRAND_IMAGE__", `data:image/png;base64,${readFileSync(new URL("public/linkens-sphere-logo.png", root)).toString("base64")}`);
const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src __TEST_ASSET_ORIGIN__/compendium/ https://cdn.cloudflare.steamstatic.com data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
writeFileSync(new URL("frame.html", directory), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>Компендиум · ТЕСТ</title><style>${css}</style><div id="compendium-test"></div><script>${script}</script></html>`);
console.log("Independent compendium test built; live service imports are forbidden.");
