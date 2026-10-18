import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import nextConfig from "../next.config.ts";
import { imageConfigDefault } from "next/dist/shared/lib/image-config.js";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/compendium-test/", root);
mkdirSync(directory, { recursive: true });
const runtime = new URL("app/compendium/test/runtime/", root);
const resolve = { alias: { "@": fileURLToPath(root), ...Object.fromEntries(["image", "link", "navigation"].map((name) => [`next/${name}`, fileURLToPath(new URL(`${name}.${name === "navigation" ? "ts" : "tsx"}`, runtime))])) } };
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve,
  define: { "process.env.NODE_ENV": JSON.stringify("production"), "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ ...imageConfigDefault, ...nextConfig.images }) },
  plugins: [{ name: "enforce-compendium-test-isolation", generateBundle() {
    const modules = [...this.getModuleIds()].map((id) => id.replaceAll("\\", "/"));
    const forbidden = modules.filter((id) => /\/app\/.*\/services\//.test(id) || /\/lib\/(db|auth|site-request|logout-action)\./.test(id) || /\/(pg|postgres)\//.test(id) || id.includes("useOctoberGuideVisibility"));
    if (forbidden.length) this.error(`Test bundle contains live services: ${forbidden.join(", ")}`);
    writeFileSync(new URL("modules.json", directory), JSON.stringify(modules.filter((id) => !id.includes("node_modules")), null, 2));
  } }],
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("entry.tsx", runtime)), formats: ["iife"], name: "CompendiumTest", fileName: () => "sandbox.js" } },
});
console.log("Rendering synthetic initial test HTML.");
const renderer = await createServer({ configFile: false, root: fileURLToPath(root), resolve,
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true } });
let initialHtml;
try {
  const { renderTestCompendium } = await renderer.ssrLoadModule("/app/compendium/test/runtime/render.tsx");
  console.log("Test renderer loaded.");
  initialHtml = renderTestCompendium();
  console.log("Synthetic test HTML rendered.");
} finally { await renderer.close(); }
const cssSource = '@import "./app/globals.css";\n@import "./app/styles/compendium-route.css";\n@import "./app/styles/72-compendium-test.css";';
const compiled = await postcss([tailwindcss({ base: fileURLToPath(root), optimize: true })]).process(cssSource, { from: fileURLToPath(new URL("compendium-test.css", root)) });
const css = compiled.css.replace(/url\(["']?(\/fonts\/[^)"']+)["']?\)/g, (_, path) => `url("data:font/ttf;base64,${readFileSync(new URL(`public${path}`, root)).toString("base64")}")`);
const script = readFileSync(new URL("bundle/sandbox.js", directory), "utf8").replace(/<\/script/gi, "<\\/script");
const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src __TEST_ASSET_ORIGIN__/compendium/ __TEST_ASSET_ORIGIN__/api/compendium/heroes/ __TEST_ASSET_ORIGIN__/linkens-sphere-logo.png data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
writeFileSync(new URL("frame.html", directory), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>Компендиум · ТЕСТ</title><style>${css}</style><div id="compendium-test">${initialHtml}</div><script>${script}</script></html>`);
console.log("Independent compendium test built; live service imports are forbidden.");
