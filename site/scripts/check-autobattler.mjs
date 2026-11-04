import assert from "node:assert/strict";
import { mkdirSync, readFileSync,existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";
import {checkCombatPresentation} from "./check-combat-presentation.mjs";
import {checkHeroLibrary} from "./check-hero-library.mjs";
import {checkSummonPresentation} from "./check-summon-presentation.mjs";

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
const css = ['01-foundation.css','autobattler.css','autobattler-summon.css','autobattler-library.css','autobattler-combat.css'].map(name=>readFileSync(new URL(`app/styles/${name}`,root),'utf8')).join('\n');
const server = createServer((request, response) => {
  if(request.url?.startsWith('/autobattler/')){
    const asset=new URL(`public${request.url}`,root);
    if(!existsSync(asset)){response.writeHead(404);response.end();return;}
    response.setHeader('content-type',request.url.endsWith('.json')?'application/json':request.url.endsWith('.svg')?'image/svg+xml':request.url.endsWith('.webp')?'image/webp':'image/png');response.end(readFileSync(asset));
  } else if (request.url === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><button style="position:fixed;right:16px;bottom:16px;z-index:110;width:80px;height:44px">DEV i</button><script src="/preview.js"></script>`);
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
 if(!process.argv.includes('--library')&&!process.argv.includes('--combat'))await checkSummonPresentation(browser,`http://127.0.0.1:${server.address().port}`,directory);
 if(!process.argv.includes('--summon')&&!process.argv.includes('--combat'))await checkHeroLibrary(browser,`http://127.0.0.1:${server.address().port}`,directory);
 if(!process.argv.includes('--summon')&&!process.argv.includes('--library'))await checkCombatPresentation(browser,`http://127.0.0.1:${server.address().port}`,directory);
 for(const [width,height] of (process.argv.includes('--summon')||process.argv.includes('--library')||process.argv.includes('--combat')?[]:process.argv.includes('--focused')?[[390,844],[1366,768],[1920,1080],[2560,1440]]:[[360,640],[390,844],[430,932],[1366,768],[1920,1080],[2560,1440]])){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/autobattler/')&&response.status()>=400)errors.push(`Asset ${response.status()}: ${response.url()}`);});
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
  await fits('campaign-start');
  for(const tab of ['Герои','Команда','Призыв','Кампания','Разработчик']){await page.getByRole('button',{name:tab,exact:true}).last().click();await fits(tab);}
  await page.getByRole('button',{name:'Герои',exact:true}).last().click();await page.getByRole('button',{name:'Эпические',exact:true}).click();assert.ok(await page.locator('.ab-card').count()>0);await page.getByRole('button',{name:'Эпические',exact:true}).click();
  const names=new Set();for(let i=0;i<12;i++){for(const name of await page.locator('.ab-card strong').allTextContents())names.add(name);const next=page.getByRole('button',{name:'Следующие герои',exact:true});if(await next.isDisabled())break;await next.click();}assert.equal(names.size,5);
  await page.locator('.ab-card').first().click();await fits('hero-profile');
  assert.equal(await page.locator('.ab-skill-buttons button').count(),3);
  for(const type of ['Базовый навык','Ультимейт',await page.getByRole('button',{name:'Лидерская пассивка',exact:true}).count()?'Лидерская пассивка':'Пассивка']){
   await page.getByRole('button',{name:type,exact:true}).click();await page.getByRole('dialog',{name:type,exact:true}).waitFor();
   const clipped=await page.locator('.ab-ability-dialog').evaluate(root=>[...root.querySelectorAll('button,h2,p,small')].filter(element=>{const r=element.getBoundingClientRect();return r.bottom>innerHeight||r.top<0||r.left<0||r.right>innerWidth;}).map(element=>element.textContent));assert.deepEqual(clipped,[]);
   await page.screenshot({path:fileURLToPath(new URL(`ability-${type}-${width}.png`,directory))});
   await page.getByRole('button',{name:'Закрыть умение'}).click();
  }
  await page.getByRole('button',{name:'Ультимейт',exact:true}).click();await page.getByRole('button',{name:'Показать способность'}).click();await page.getByRole('button',{name:'Закрыть героя'}).click();
  await page.getByRole('button',{name:'Редкие',exact:true}).click();
  await page.locator('.ab-card').first().click();await page.getByRole('button',{name:'Повысить уровень · 40 опыта',exact:true}).click();await page.getByRole('button',{name:'Повысить уровень · 80 опыта',exact:true}).waitFor();assert.equal(await page.locator('.ab-profile-level strong').innerText(),'2');await page.getByRole('button',{name:'Закрыть героя'}).click();
  await page.getByRole('button',{name:'Призыв',exact:true}).last().click();await page.getByRole('button',{name:'Призвать 1 · 1 оск.',exact:true}).click();await page.waitForTimeout(2000);assert.equal(await page.locator('.ab-summoned-hero').count(),0);await page.getByRole('button',{name:'Продолжить',exact:true}).waitFor();await fits('summon-reveal');await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.getByRole('button',{name:'Команда',exact:true}).last().click();assert.equal(await page.locator('.ab-field-unit').count(),5);assert.equal(await page.locator('.ab-enemy-unit').count(),0);
  await page.getByRole('button',{name:'Подробнее: Бастион',exact:true}).click();await page.getByRole('dialog',{name:'Бастион',exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть героя'}).click();
  async function dragTo(source,target){const a=await source.boundingBox(),b=await target.boundingBox();assert.ok(a&&b);await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();}
  const first=page.locator('[data-formation-slot="0"]'),second=page.locator('[data-formation-slot="1"]');
  await dragTo(first,second);assert.equal(await second.getAttribute('data-formation-hero'),'bastion');
  await dragTo(second,page.locator('.ab-roster .ab-gallery-tools'));assert.equal(await second.getAttribute('data-formation-hero'),null);
  await dragTo(page.locator('.ab-roster [data-formation-hero="bastion"]'),second);assert.equal(await second.getAttribute('data-formation-hero'),'bastion');
  assert.equal(await page.locator('.ab-game').evaluate(element=>!element.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),true);
await page.getByRole('button',{name:/^Позиция 5/}).click();await page.locator('.ab-card').first().click();await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('Состав сохранён',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Кампания',exact:true}).last().click();await page.getByRole('button',{name:/^Подготовить отряд/}).click();assert.equal(await page.locator('.ab-field-unit').count(),10);await page.getByRole('button',{name:'Начать бой',exact:true}).click();await page.locator('canvas').waitFor();await page.getByRole('button',{name:'Скорость ×1',exact:true}).click();await page.getByRole('button',{name:'Пауза',exact:true}).click();await fits('arena');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.getByRole('button',{name:'К кампании',exact:true}).waitFor({timeout:60000});await fits('result');
  if(width===1920){
   const roster=await browser.newPage({viewport:{width,height}});
   await roster.goto(`http://127.0.0.1:${server.address().port}/?all=1`);
   await roster.getByRole('button',{name:'Команда',exact:true}).click();
   const cards=roster.locator('.ab-roster .ab-card');
   await cards.nth(4).waitFor();
   await roster.waitForTimeout(450);
   assert.equal(await cards.count(),5);
   assert.equal(await cards.evaluateAll(items=>new Set(items.map(item=>Math.round(item.getBoundingClientRect().top))).size),1);
   await roster.screenshot({path:fileURLToPath(new URL('roster-all-1920.png',directory))});
   await roster.close();
  }
  if(width===1366){
   await page.getByRole('button',{name:'Разработчик',exact:true}).click();
   await page.getByRole('button',{name:'Бои',exact:true}).click();
   await page.getByLabel('Противник 1').selectOption('orion');
   await page.getByRole('button',{name:'Тестовый бой',exact:true}).click();
   await page.locator('canvas').waitFor();
   await page.waitForTimeout(900);
   await page.getByRole('button',{name:'Пауза',exact:true}).click();
   await fits('orion-rig');
  }
  assert.deepEqual(errors,[]);console.log(`Fullscreen scenes, five heroes, summon concealment, fixed formation and combat verified ${width}×${height}`);await page.close();
 }
}finally{await browser.close();server.close();}
