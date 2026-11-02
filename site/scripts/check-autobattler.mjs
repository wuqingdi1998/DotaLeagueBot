import assert from "node:assert/strict";
import { mkdirSync, readFileSync,existsSync } from "node:fs";
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
  if(request.url?.startsWith('/autobattler/')){
    const asset=new URL(`public${request.url}`,root);
    if(!existsSync(asset)){response.writeHead(404);response.end();return;}
    response.setHeader('content-type',request.url.endsWith('.webp')?'image/webp':'image/png');response.end(readFileSync(asset));
  } else if (request.url === "/preview.js") {
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
 for(const [width,height] of (process.argv.includes('--focused')?[[360,640],[1366,768]]:[[360,640],[390,844],[430,932],[1366,768],[1920,1080]])){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Герои',exact:true}).last().waitFor({timeout:10000}).catch(async error=>{console.log(errors,await page.locator('body').innerText());await page.screenshot({path:fileURLToPath(new URL('failure.png',directory))});throw error;});
  async function fits(name){
   await page.waitForTimeout(450);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,`${name} page overflow`);
   const overflowing=await page.locator('.ab-scene').evaluate(root=>[root,...root.querySelectorAll('*')].filter(element=>getComputedStyle(element).overflowY==='auto'||getComputedStyle(element).overflowY==='scroll').filter(element=>element.scrollHeight>element.clientHeight+1).map(element=>element.className));
   assert.deepEqual(overflowing,[],`${name}: nested scroll`);
   const clipped=await page.locator('.ab-scene').evaluate(root=>{const bounds=root.getBoundingClientRect();return [...root.querySelectorAll('button,select,input,h2,p')].filter(element=>element.checkVisibility()).filter(element=>{const r=element.getBoundingClientRect();return r.bottom>bounds.bottom+2||r.top<bounds.top-2||r.left<bounds.left-2||r.right>bounds.right+2;}).map(element=>element.textContent?.slice(0,45));});
   assert.deepEqual(clipped,[],`${name}: content outside scene`);
   await page.screenshot({path:fileURLToPath(new URL(`${name}-${width}.png`,directory))});
  }
  await fits('home');
  for(const tab of ['Герои','Команда','Призыв','Кампания','Разработчик']){await page.getByRole('button',{name:tab,exact:true}).last().click();await fits(tab);}
  await page.getByRole('button',{name:'Герои',exact:true}).last().click();assert.equal(await page.locator('.ab-card').count(),6);
  const names=new Set();for(let i=0;i<4;i++){for(const name of await page.locator('.ab-card strong').allTextContents())names.add(name);if(i<3)await page.getByRole('button',{name:'Следующие герои',exact:true}).click();}assert.equal(names.size,24);
  await page.locator('.ab-card').first().click();await page.getByRole('button',{name:'Показать способность'}).click();await fits('hero-profile');await page.getByRole('button',{name:'Закрыть героя'}).click();
  await page.getByRole('button',{name:'Призыв',exact:true}).last().click();await page.getByRole('button',{name:'Призвать 1 · 1 бил.',exact:true}).click();await page.waitForTimeout(2000);assert.equal(await page.locator('.ab-summoned-hero').count(),0);await page.getByRole('button',{name:'Продолжить',exact:true}).waitFor();await fits('summon-reveal');await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.getByRole('button',{name:'Команда',exact:true}).last().click();await page.getByRole('button',{name:'Позиция 5',exact:true}).click();await page.locator('.ab-card').filter({hasText:'Эхо'}).click();await page.getByRole('button',{name:'Сохранить состав',exact:true}).click();await page.getByText('Состав сохранён',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Позиция 2',exact:true}).click();await page.getByRole('button',{name:'Освободить место',exact:true}).click();assert.ok((await page.getByRole('button',{name:'Позиция 5',exact:true}).textContent()).includes('Эхо'));await page.locator('.ab-card').filter({hasText:'Искра'}).click();await page.getByRole('button',{name:'Сохранить состав',exact:true}).click();
  await page.getByRole('button',{name:'Кампания',exact:true}).last().click();assert.equal(await page.locator('.ab-saved-team [role=img]').count(),5);assert.equal(await page.locator('.ab-saved-team [aria-label=Эхо]').count(),1);await page.getByRole('button',{name:/^В бой/}).click();await page.locator('canvas').waitFor();await page.getByRole('button',{name:'Скорость ×1',exact:true}).click();await page.getByRole('button',{name:'Пауза',exact:true}).click();await fits('arena');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.getByRole('button',{name:'К кампании',exact:true}).waitFor({timeout:60000});await fits('result');
  if(width===360){const mass=await browser.newPage({viewport:{width,height}});await mass.goto(`http://127.0.0.1:${server.address().port}`);await mass.getByRole('button',{name:'Призыв',exact:true}).click();await mass.getByRole('button',{name:'Призвать 10 · 10 бил.',exact:true}).click();await mass.waitForTimeout(2000);assert.equal(await mass.locator('.ab-summoned-hero').count(),0);await mass.getByRole('button',{name:'Следующий · 1/10',exact:true}).waitFor();for(let index=1;index<10;index++)await mass.getByRole('button',{name:`Следующий · ${index}/10`,exact:true}).click();await mass.getByRole('button',{name:'Продолжить',exact:true}).click();await mass.getByRole('button',{name:'Герои',exact:true}).click();await mass.locator('.ab-card').first().waitFor();await mass.close();}
  assert.deepEqual(errors,[]);console.log(`Fullscreen scenes, 24 heroes, summon concealment, fixed formation and combat verified ${width}×${height}`);await page.close();
 }
}finally{await browser.close();server.close();}
