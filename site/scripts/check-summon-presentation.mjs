import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function checkSummonPresentation(browser,url,directory){
 for(const [width,height] of [[1920,1080],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const shot=async name=>page.screenshot({path:fileURLToPath(new URL(`${name}-${width}.png`,directory))});
  try{
   await page.goto(url);
   await page.getByRole('button',{name:'Призыв',exact:true}).click();
   await page.locator('.ab-shrine-stage canvas').waitFor();
   await page.waitForTimeout(500);
   await shot('summon-crystal');
   await page.getByRole('button',{name:'Призвать 10 · 10 оск.',exact:true}).click();
   await page.locator('.ab-summon-slot.is-opening.ab-result-Legendary').waitFor();
   assert.equal(await page.locator('.ab-summon-card').count(),0);
   assert.equal(await page.locator('.ab-summon-seal').count(),10);
   await page.waitForTimeout(1400);
   await shot('summon-legendary-opening');
   await page.locator('.ab-summon-slot.is-opening.ab-result-Epic').waitFor();
   assert.equal(await page.locator('.ab-summon-card').count(),1);
   if(width===1920){
    await page.reload();
    await page.locator('.ab-summon-slot.is-opening.ab-result-Epic').waitFor();
    assert.equal(await page.locator('.ab-summon-card').count(),1);
    await page.getByRole('button',{name:'Пропустить и открыть все',exact:true}).click();
   }else{
    await page.locator('.ab-summon-slot.is-opening').click();
   }
   await page.getByRole('button',{name:'Продолжить',exact:true}).waitFor();
   assert.equal(await page.locator('.ab-summon-card').count(),10);
   assert.equal(await page.locator('.ab-result-role').count(),10);
   const layout=await page.locator('.ab-summon-scene').evaluate(scene=>{
    const bounds=scene.getBoundingClientRect();
    return {left:bounds.left,right:bounds.right,view:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
     clipped:[...scene.querySelectorAll('.ab-result-role')].some(icon=>{const card=icon.closest('button').getBoundingClientRect(),mark=icon.getBoundingClientRect();return mark.left<card.left||mark.right>card.right||mark.top<card.top||mark.bottom>card.bottom;})};
   });
   assert.equal(layout.left,0);assert.equal(layout.right,layout.view);assert.equal(layout.overflow,false);assert.equal(layout.clipped,false);
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('heroes-summon-fixture')).history.length),1);
   await page.waitForTimeout(420);await shot('summon-ten-results');
   await page.locator('.ab-summon-card').first().click();
   await page.locator('.ab-summoned-hero').waitFor();
   await page.getByRole('button',{name:'К результатам',exact:true}).click();
   await page.getByRole('button',{name:'Продолжить',exact:true}).click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('lse-autobattler-summon')),null);
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 const epic=await browser.newPage({viewport:{width:1366,height:768}});
 try{
  await epic.goto(url+'/?epic=1');
  await epic.getByRole('button',{name:'Призыв',exact:true}).click();
  await epic.getByRole('button',{name:'Призвать 1 · 1 оск.',exact:true}).click();
  await epic.locator('.ab-summon-opening.ab-reveal-Epic').waitFor();
  assert.equal(await epic.locator('.ab-summoned-hero').count(),0);
  await epic.waitForTimeout(1000);
  await epic.screenshot({path:fileURLToPath(new URL('summon-epic-opening-1366.png',directory))});
  await epic.getByRole('button',{name:'Продолжить',exact:true}).waitFor();
  await epic.locator('.ab-summoned-hero').waitFor();
 }finally{await epic.close();}
 const automatic=await browser.newPage({viewport:{width:1366,height:768}});
 try{
  await automatic.goto(url);
  await automatic.getByRole('button',{name:'Призыв',exact:true}).click();
  await automatic.getByRole('button',{name:'Призвать 10 · 10 оск.',exact:true}).click();
  await automatic.getByRole('status').filter({hasText:'Открыто 10 из 10'}).waitFor({timeout:25000});
  assert.equal(await automatic.locator('.ab-summon-card').count(),10);
  assert.equal(await automatic.evaluate(()=>JSON.parse(sessionStorage.getItem('heroes-summon-fixture')).history.length),1);
 }finally{await automatic.close();}
 console.log('Summon presentation passed: epic solo, legendary and epic batch, restore, both skip gestures and unclipped roles');
}
