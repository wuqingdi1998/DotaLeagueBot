import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function checkHeroLibrary(browser,url,directory){
 for(const [width,height] of [[360,640],[390,844],[1366,768],[1920,1080],[2560,1440]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<650});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(url);
   await page.getByRole('button',{name:'Герои',exact:true}).click();
   const library=page.locator('.ab-hero-library'),cards=library.locator('.ab-card');
   await cards.first().waitFor();
   async function settleBook(){await library.evaluate(async element=>{await Promise.all(element.getAnimations({subtree:true}).filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});}
   await settleBook();
   assert.equal(await library.locator('select').count(),0);
   assert.equal(await library.getByRole('button',{name:'Галерея',exact:true}).count(),0);
   assert.equal(await library.getByRole('button',{name:'Список',exact:true}).count(),0);
   const slots=library.locator('[data-book-slot]');
   assert.equal(await slots.count(),14);
   assert.equal(await slots.evaluateAll(items=>new Set(items.map(item=>Math.round(item.getBoundingClientRect().top))).size),2);
   assert.equal(await slots.evaluateAll(items=>new Set(items.map(item=>Math.round(item.getBoundingClientRect().left))).size),7);
   assert.deepEqual(await cards.evaluateAll(items=>items.map(item=>Number(item.parentElement.dataset.bookSlot))),[0,1,2,3,4]);
   assert.equal(await cards.evaluateAll(items=>new Set(items.map(item=>Math.round(item.getBoundingClientRect().top))).size),1);
   assert.equal(await cards.first().evaluate(element=>element.classList.contains('ab-Legendary')),true);
   const names=new Set();const next=library.getByRole('button',{name:'Следующие герои'}),previous=library.getByRole('button',{name:'Предыдущие герои'});
   for(let i=0;i<12;i++){
    assert.ok(await cards.count()>0);
    for(const name of await cards.locator('strong').allTextContents())names.add(name);
    if(await next.isDisabled())break;
    await next.click();
   }
   assert.equal(names.size,5);assert.equal(await next.isDisabled(),true);
   await library.getByRole('button',{name:'Эпические',exact:true}).click();
   assert.equal(await previous.isDisabled(),true);
   assert.equal(await cards.evaluateAll(items=>items.every(item=>item.classList.contains('ab-Epic'))),true);
   await library.getByRole('button',{name:'Легендарные',exact:true}).click();
   assert.equal(await library.getByRole('button',{name:'Эпические',exact:true}).getAttribute('aria-pressed'),'true');
   assert.equal(await cards.evaluateAll(items=>items.every(item=>!item.classList.contains('ab-Rare'))),true);
   await library.getByRole('button',{name:'Эпические',exact:true}).click();
   await library.getByRole('button',{name:'Легендарные',exact:true}).click();
   await library.getByRole('button',{name:'Редкость: от высокой к низкой',exact:true}).click();
   assert.equal(await cards.first().evaluate(element=>element.classList.contains('ab-Rare')),true);
   for(let index=0;index<((width===390||width===1920)?5:1);index++){
    await cards.nth(index).click();const profile=page.getByRole('dialog');await profile.waitFor();
    const images=await profile.locator('.ab-portrait').evaluateAll(items=>Promise.all(items.map(async element=>{const url=getComputedStyle(element).backgroundImage.slice(5,-2);const image=new Image();image.src=url;await image.decode();return image.naturalWidth>0;})));
    assert.deepEqual(images,[true,true],`${width}: full portrait and combat figure load`);
    if(width===390||width===1920)await page.screenshot({path:fileURLToPath(new URL(`hero-art-${index}-${width}.png`,directory))});
    await page.getByRole('button',{name:'Закрыть героя'}).click();
   }
   await library.getByRole('button',{name:'Редкость: от низкой к высокой',exact:true}).click();
   const bounds=await library.locator('.ab-library-book-scroll').boundingBox(),left=await previous.boundingBox(),right=await next.boundingBox();
   assert.ok(left.x+left.width<=bounds.x&&right.x>=bounds.x+bounds.width-1);
   assert.ok(left.height>left.width*3&&right.height>right.width*3);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false,`${width}: page overflow`);
   const clipped=await library.evaluate(root=>[...root.querySelectorAll('button,h2,.ab-card-role,.ab-card-caption')].filter(element=>!element.closest('.ab-library-book-scroll')).filter(element=>{const r=element.getBoundingClientRect();return r.top<0||r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1;}).map(element=>element.className));
   assert.deepEqual(clipped,[]);
   await settleBook();
   const scroll=library.locator('.ab-library-book-scroll');
   if(width<650){
    assert.equal(await scroll.evaluate(element=>element.scrollWidth>element.clientWidth),true);
    const session=await page.context().newCDPSession(page),bounds=await scroll.boundingBox();
    const x=bounds.x+bounds.width-20,y=bounds.y+bounds.height*.75;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-step*20,y}]});await page.waitForTimeout(20);}
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(await scroll.evaluate(element=>element.scrollLeft)>40,'Phone book pans with a real touch gesture');
    await session.detach();await scroll.evaluate(element=>{element.scrollLeft=0;});
   }
   await page.screenshot({path:fileURLToPath(new URL(`hero-library-${width}.png`,directory))});
   await page.getByRole('button',{name:'Команда',exact:true}).click();
   const owned=page.locator('.ab-roster .ab-card');assert.equal(await owned.count(),5);
   await page.waitForTimeout(200);
   if(width>1000)assert.equal(await owned.evaluateAll(items=>items.every(item=>item.getBoundingClientRect().width<=130&&item.getBoundingClientRect().height>=80)),true);
   await page.screenshot({path:fileURLToPath(new URL(`five-roster-${width}.png`,directory))});
   assert.deepEqual(errors,[]);
   console.log(`Hero library: two rows, rarity circles, sorting, all pages and profile verified ${width}×${height}`);
  }finally{await page.close();}
 }
}
