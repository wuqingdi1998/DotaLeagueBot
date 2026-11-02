import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/autobattler/", root);
mkdirSync(directory, { recursive: true });
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/autobattler-browser.tsx", root)), formats: ["iife"], name: "DevelopmentCheck", fileName: () => "preview.js" },
  },
});
const css = ['01-foundation.css','autobattler.css'].map(name=>readFileSync(new URL(`app/styles/${name}`,root),'utf8')).join('\n');
const server = createServer((request, response) => {
  if (request.url === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/preview.js"></script>`);
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width,height] of (process.argv.includes('--focused') ? [[360,640],[1366,768]] : [[360,640],[390,844],[768,1024],[1366,768],[1920,1080]])) {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button',{name:'Мой отряд',exact:true}).waitFor();
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>{document.body.className='site-shell';document.body.dataset.theme=theme;},theme);
      assert.equal(await page.locator('.ab-game').evaluate(element=>getComputedStyle(element).color),'rgb(233, 239, 255)');
      await page.screenshot({path:fileURLToPath(new URL(`home-${theme}-${width}.png`,directory))});
    }
    for(const tab of ['Герои','Команда','Призыв','Кампания','Разработчик']){
      await page.getByRole('button',{name:tab,exact:true}).click();
      if(tab==='Герои'){await page.getByText('Сравнить характеристики героев',{exact:true}).click();await page.getByLabel('Второй герой',{exact:true}).selectOption('orion');}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${tab} overflows at ${width}`);
      await page.screenshot({path:fileURLToPath(new URL(`${tab}-${width}.png`,directory))});
    }
    await page.getByRole('button',{name:'Призыв',exact:true}).click();
    await page.getByRole('button',{name:'Призвать 1 · 1 бил.',exact:true}).click();
    await page.getByText('✦ 9 билетов',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Кампания',exact:true}).click();
    await page.getByRole('button',{name:'В бой',exact:true}).first().click();
    await page.locator('canvas').waitFor();
    await page.getByRole('button',{name:'Скорость ×1',exact:true}).click();
    await page.getByRole('button',{name:'Пауза',exact:true}).click();
    await page.screenshot({path:fileURLToPath(new URL(`arena-${width}.png`,directory))});
    await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await page.getByRole('button',{name:'К кампании',exact:true}).waitFor({timeout:60000});
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(`Autobattler screens and real Phaser replay verified ${width}×${height}`);
    await page.close();
  }
}finally{await browser.close();server.close();}
