import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {renameSync} from 'node:fs';

export async function checkCombatPresentation(browser,url,directory){
 for(const [width,height] of [[390,844],[1366,768],[1920,1080]]){
  const context=await browser.newContext({viewport:{width,height},recordVideo:width===1366?{dir:fileURLToPath(directory),size:{width,height}}:undefined});
  const page=await context.newPage(),errors=[],assets=new Set();
  await page.addInitScript(()=>{
   const Native=window.AudioContext;
   window.AudioContext=class extends Native{
    constructor(...args){super(...args);window.combatAudioCheck={context:this,voices:0};}
    createOscillator(){const oscillator=super.createOscillator(),start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{window.combatAudioCheck.voices++;return start(...args);};return oscillator;}
   };
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('-cutout.webp')){assets.add(new URL(response.url()).pathname);if(response.status()>=400)errors.push(`Asset ${response.status()}`);}});
  const video=page.video();
  try{
   await page.goto(url);
   await page.getByRole('button',{name:'Разработчик',exact:true}).click();
   await page.getByRole('button',{name:'Бои',exact:true}).click();
   const tickets=await page.locator('.ab-tickets').innerText();
   await page.getByRole('button',{name:'Образец анимаций · 3 волны',exact:true}).click();
   const arena=page.locator('.ab-arena');await arena.locator('canvas').waitFor();
   await arena.locator('canvas').click();
   await page.getByRole('button',{name:'Звук включён',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'Звук выключен',exact:true}).getAttribute('aria-pressed'),'false');
   await page.getByRole('button',{name:'Звук выключен',exact:true}).click();
   await page.getByRole('button',{name:'Пауза',exact:true}).click();
   await page.waitForTimeout(180);
   const paused=await arena.screenshot();await page.waitForTimeout(180);
   assert.equal((await arena.screenshot()).equals(paused),true,'paused geometry and effects are frozen');
   await page.getByRole('button',{name:'Продолжить',exact:true}).click();
   await page.waitForTimeout(1800);
   assert.ok(await page.evaluate(()=>window.combatAudioCheck?.voices>0),'Web Audio actually schedules sound');
   await page.screenshot({path:fileURLToPath(new URL(`combat-actions-${width}.png`,directory))});
   for(const asset of ['/autobattler/bastion-cutout.webp','/autobattler/iskra-cutout.webp'])assert.equal(assets.has(asset),true,asset);
   await page.getByRole('button',{name:'Скорость ×1',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.ab-arena')?.getAttribute('data-battle-phase')==='march',{},{timeout:25000});
   await page.screenshot({path:fileURLToPath(new URL(`combat-march-${width}.png`,directory))});
   await page.waitForFunction(()=>document.querySelector('.ab-arena')?.getAttribute('data-battle-wave')==='3'&&document.querySelector('.ab-arena')?.getAttribute('data-battle-phase')==='boss',{},{timeout:30000});
   await page.waitForTimeout(180);
   await page.screenshot({path:fileURLToPath(new URL(`combat-boss-${width}.png`,directory))});
   await page.getByRole('button',{name:'К кампании',exact:true}).waitFor({timeout:30000});
   assert.equal(await page.getByRole('heading',{name:'ПОБЕДА',exact:true}).count(),1);
   assert.equal(await page.locator('.ab-tickets').innerText(),tickets);
   assert.equal(await page.getByText('Образец анимаций · награды не начисляются',{exact:true}).count(),1);
   const clipped=await page.locator('.ab-game button,.ab-game a').evaluateAll(items=>items.filter(item=>{const b=item.getBoundingClientRect();return b.right>innerWidth+1||b.left<0||b.bottom>innerHeight+1||b.top<0;}).map(item=>item.textContent));assert.deepEqual(clipped,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
   assert.deepEqual(errors,[]);
   await page.getByRole('button',{name:'К кампании',exact:true}).click();
   await page.waitForFunction(()=>window.combatAudioCheck?.context.state==='closed');
   console.log(`Combat: articulated assets, pause, sound, march, third-wave boss and victory verified ${width}×${height}`);
  }finally{
   await context.close();
   if(video)renameSync(await video.path(),fileURLToPath(new URL('combat-review.webm',directory)));
  }
 }
}
