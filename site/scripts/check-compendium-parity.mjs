import assert from "node:assert/strict";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import sharp from "sharp";
import { chromium } from "playwright";
import { visualStyleDifferences } from "./compendium-parity-styles.ts";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/compendium-parity/", root);
mkdirSync(new URL("screenshots/", directory), { recursive: true });
// Compile the reference using the site's real PostCSS/Tailwind pipeline and import order.
let mainCss = (await postcss([tailwindcss({ base: fileURLToPath(root), optimize: true })]).process(
  '@import "./app/globals.css";\n@import "./app/styles/compendium-route.css";\n@import "./app/styles/72-compendium-test.css";',
  { from: fileURLToPath(new URL("compendium-parity.css", root)) },
)).css;
if (process.argv.includes("--production")) {
  const manifest = {};
  runInNewContext(readFileSync(new URL(".next/server/app/compendium/page_client-reference-manifest.js", root), "utf8"), manifest);
  const files = manifest.__RSC_MANIFEST["/compendium/page"].entryCSSFiles;
  const paths = [...new Set(Object.values(files).flat().map((entry) => entry.path))];
  assert.ok(paths.length > 0, "Production compendium styles must exist");
  mainCss = paths.map((path) => readFileSync(new URL(`.next/${path}`, root), "utf8")).join("\n")
    + readFileSync(new URL("app/styles/72-compendium-test.css", root), "utf8");
}
const testFrame = readFileSync(new URL(".data/compendium-test/frame.html", root), "utf8");
const testCss = testFrame.match(/<style>([\s\S]*?)<\/style>/)[1];
const names = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
const fixtures = Object.fromEntries(names.map((name) => [name, JSON.parse(readFileSync(new URL(`${name}.json`, directory), "utf8"))]));
const selectedCase = process.argv.find((argument) => argument.startsWith("--case="))?.slice(7);
const selectedWidth = Number(process.argv.find((argument) => argument.startsWith("--width="))?.slice(8));
const caseNames = selectedCase ? names.filter((name) => name === selectedCase) : names;
assert.ok(caseNames.length, "Unknown parity case");
const viewports = [[1900, 870], [1366, 768], [961, 700], [768, 1024], [393, 852]].filter(([width]) => !selectedWidth || width === selectedWidth);
assert.ok(viewports.length, "Unknown parity viewport");
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const match = url.pathname.match(/^\/(main|test)\/([a-z]+)$/);
  if (match) {
    const [, mode, name] = match;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${mode === "main" ? mainCss : testCss}</style>${fixtures[name][mode]}`);
    return;
  }
  if (url.pathname === "/runtime") {
    const source = testFrame.replaceAll("__TEST_ASSET_ORIGIN__", `http://127.0.0.1:${server.address().port}`);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><style>body{margin:0}iframe{width:100%;height:100dvh;border:0;display:block}</style><iframe sandbox="allow-scripts" credentialless srcdoc="${source.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></iframe>`);
    return;
  }
  const file = new URL(`public${url.pathname}`, root);
  if (!existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  // Keep scrolling, animation and rasterization deterministic across documents and frames.
  args: ["--disable-threaded-scrolling", "--disable-threaded-animation", "--disable-gpu", "--disable-lcd-text"],
});
const sections = ["clans", "personal", "race", "daily"];
// The toolbar contains intentionally different test controls; exclude its glow and navigation state.
const hideNavigation = ".october-section-navigation,.site-header{visibility:hidden}";

async function capture(page, target, section) {
  await target.evaluate((css) => {
    if (document.getElementById("parity-toolbar-exclusion")) return;
    const style = document.createElement("style");
    style.id = "parity-toolbar-exclusion";
    style.textContent = css;
    document.head.append(style);
  }, hideNavigation);
  await page.mouse.move(0, 0);
  const locator = target.locator(`.october-compendium-screen-${section}`);
  await locator.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await locator.evaluate(async (root) => {
    await document.fonts.ready;
    // Decode offscreen lazy images for deterministic full-section screenshots, then restore attributes.
    await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
      const loading = image.getAttribute("loading");
      image.loading = "eager";
      await image.decode().catch(() => {});
      if (loading === null) image.removeAttribute("loading"); else image.setAttribute("loading", loading);
    }));
  });
  await page.waitForTimeout(100);
  await target.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const images = await locator.locator("img").evaluateAll((images) => images.map((image) => ({
    src: image.getAttribute("src"), loading: image.loading, decoding: image.decoding,
    width: image.width, height: image.height, style: Object.fromEntries(["position", "left", "top", "right", "bottom", "object-fit", "object-position", "color"].map((property) => [property, getComputedStyle(image).getPropertyValue(property)])),
    complete: image.complete && image.naturalWidth > 0,
  })));
  assert.ok(images.every((image) => image.complete), `All ${section} images must load`);
  const layout = await locator.evaluate((root) => [...root.querySelectorAll("*")].map((element) => {
    const bounds = element.getBoundingClientRect(), origin = root.getBoundingClientRect(), css = getComputedStyle(element);
    return { tag: element.tagName, className: element.getAttribute("class"),
      box: [bounds.x - origin.x, bounds.y - origin.y, bounds.width, bounds.height],
      style: Object.fromEntries(["font-family", "font-size", "font-weight", "line-height", "gap", "margin", "padding", "display"].map((property) => [property, css.getPropertyValue(property)])),
    };
  }));
  const origin = await locator.boundingBox();
  // A parent screenshot cannot paint beyond an iframe's viewport. Compare the same
  // visible area on mobile, and check the entire section's geometry independently.
  const viewport = page.viewportSize();
  const clipTop = Math.max(0, Math.floor(origin.y));
  const pixels = viewport.width <= 960
    ? await page.screenshot({ clip: { x: Math.floor(origin.x), y: clipTop, width: Math.ceil(origin.width), height: Math.min(Math.ceil(origin.y + origin.height), viewport.height) - clipTop }, animations: "disabled" })
    : await locator.screenshot({ animations: "disabled" });
  const vectors = await locator.locator("svg, svg *").evaluateAll((elements) => elements.map((element) => ({
    tag: element.tagName,
    attributes: Object.fromEntries([...element.attributes].filter((attribute) => attribute.name !== "style" && !attribute.name.startsWith("aria-")).map((attribute) => [attribute.name, attribute.value]).sort(([a], [b]) => a.localeCompare(b))),
  })));
  const controls = await locator.locator("input,select,button,textarea").evaluateAll((elements) => elements.map((element) => ({
    tag: element.tagName, value: element.value, checked: element.checked, disabled: element.disabled, selectedIndex: element.selectedIndex,
  })));
  return { pixels, images, layout, origin, locator, vectors, controls };
}

async function assertSame(main, test, label) {
  assert.deepEqual(test.images, main.images, `${label}: image sources/loading/sizes`);
  assert.deepEqual(test.vectors, main.vectors, `${label}: icon/vector shapes`);
  assert.deepEqual(test.controls, main.controls, `${label}: control values and availability`);
  // Hidden nodes have no visual position; SVG arithmetic includes subpixel float noise.
  const geometry = (layout) => layout.map(({ tag, className, box }) => ({ tag, className,
    box: box[2] === 0 && box[3] === 0 ? [0, 0, 0, 0] : box.map((coordinate) => Number(coordinate.toFixed(3)) || 0),
  }));
  assert.deepEqual(geometry(test.layout), geometry(main.layout), `${label}: full section geometry`);
  const a = await sharp(main.pixels).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(test.pixels).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(b.info, a.info, `${label}: dimensions`);
  if (!a.data.equals(b.data)) {
    const allStyles = (root) => [root, ...root.querySelectorAll("*")].map((element) => {
      const read = (pseudo) => {
        const css = getComputedStyle(element, pseudo);
        return Object.fromEntries([...css].map((property) => [property, css.getPropertyValue(property)]));
      };
      return { tag: element.tagName, className: element.getAttribute("class"), css: read(null), before: read("::before"), after: read("::after") };
    });
    const mainStyles = await main.locator.evaluate(allStyles), testStyles = await test.locator.evaluate(allStyles);
    const differences = visualStyleDifferences(mainStyles, testStyles);
    writeFileSync(new URL(`screenshots/${label}-layout.json`, directory), JSON.stringify({ main: main.layout, test: test.layout, origins: [main.origin, test.origin] }, null, 2));
    writeFileSync(new URL(`screenshots/${label}-main.png`, directory), main.pixels);
    writeFileSync(new URL(`screenshots/${label}-test.png`, directory), test.pixels);
    let changed = 0;
    for (let index = 0; index < a.data.length; index += 4) if (!a.data.subarray(index, index + 4).equals(b.data.subarray(index, index + 4))) changed++;
    // Filtered text can rasterize at different subpixel phases in separate Chrome documents.
    // Do not accept a pixel percentage: require every visual input, including pseudo-elements,
    // text, complete geometry and image sources/loading, to match before accepting that case.
    assert.deepEqual(differences, [], `${label}: computed styles differ (snapshots saved)`);
    assert.equal(await test.locator.textContent(), await main.locator.textContent(), `${label}: text content`);
    equivalentRasterizations++;
    console.log(`${label}: ${changed} raster pixels differ; all computed styles, pseudo-elements, text, geometry and images are identical.`);
  } else {
    pixelMatches++;
  }
}

let comparisons = 0;
let pixelMatches = 0;
let equivalentRasterizations = 0;
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    // Both views receive the same deterministic hero bitmap through the real cached-image URL.
    await context.route(`${base}/api/compendium/heroes/**`, (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#244352"/></svg>' }));
    const mainPage = await context.newPage();
    const testPage = await context.newPage();
    for (const name of caseNames) {
      await Promise.all([mainPage.goto(`${base}/main/${name}`), testPage.goto(`${base}/test/${name}`)]);
      for (const section of ["initial", "completed", "rerolled"].includes(name) ? sections : ["race", "daily"]) {
        const main = await capture(mainPage, mainPage, section);
        const test = await capture(testPage, testPage, section);
        await assertSame(main, test, `${name}-${section}-${width}`);
        comparisons++;
      }
    }
    // Compare the actual isolated, client-rendered bundle too, not just two server renders.
    await mainPage.goto(`${base}/main/initial`);
    await testPage.goto(`${base}/runtime`);
    const frame = testPage.frames().find((frame) => frame.parentFrame());
    await frame.getByRole("button", { name: "Управление тестом", exact: true }).waitFor();
    for (const section of sections) {
      const main = await capture(mainPage, mainPage, section);
      const test = await capture(testPage, frame, section);
      await assertSame(main, test, `runtime-${section}-${width}`);
      writeFileSync(new URL(`screenshots/verified-${section}-${width}.png`, directory), test.pixels);
      comparisons++;
    }
    for (const [name, label] of [["support", "Путь Созидания (Support)"], ["core", "Путь Разрушения (Core)"]]) {
      await testPage.goto(`${base}/runtime`);
      const chosenFrame = testPage.frames().find((frame) => frame.parentFrame());
      await chosenFrame.getByRole("button", { name: label, exact: true }).click();
      await chosenFrame.getByRole("dialog").getByRole("button", { name: "Выбрать путь", exact: true }).click();
      await mainPage.goto(`${base}/main/${name}`);
      const main = await capture(mainPage, mainPage, "race");
      const test = await capture(testPage, chosenFrame, "race");
      await assertSame(main, test, `runtime-${name}-race-${width}`);
      writeFileSync(new URL(`screenshots/verified-${name}-race-${width}.png`, directory), test.pixels);
      comparisons++;
    }
    await context.close();
    console.log(`Visual geometry, styles and image parity passed at ${width} × ${height}.`);
  }
  console.log(`Main/test parity: ${comparisons} comparisons passed (${pixelMatches} pixel-exact, ${equivalentRasterizations} with identical visual inputs verified after raster differences), including the isolated runtime. Saved prize thumbnails and image loading attributes match. Dedicated scenarios also verify the new two-path race.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
