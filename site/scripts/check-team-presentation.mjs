import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function checkTeamPresentation(browser,url,directory){
 for(const [width,height] of [[360,640],[390,844],[1366,768],[1920,945],[2560,1440]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<650}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(`${url}/?formation=1`);await page.getByRole('button',{name:'Команда',exact:true}).click();
   const team=page.locator('.ab-team-scene'),cards=team.locator('.ab-roster .ab-card');
   await cards.nth(4).waitFor();await page.evaluate(()=>document.fonts.ready);
   await page.locator('.ab-saving').waitFor({state:'hidden'});
   assert.equal(await team.getByText('Выберите место, затем героя',{exact:true}).count(),0);
   assert.equal(await team.getByText('0 / 5 героев',{exact:true}).count(),0);
   assert.equal(await team.getByRole('button',{name:'О герое',exact:true}).count(),0);
   assert.equal(await team.getByRole('button',{name:'Убрать героя',exact:true}).count(),0);
   assert.equal(await team.locator('.ab-card-info').count(),0);
   const boxes=await cards.evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect();return {x:r.x,y:r.y};}));
   assert.ok(Math.abs(boxes[0].x-boxes[1].x)<1&&boxes[1].y>boxes[0].y&&boxes[2].x>boxes[0].x&&Math.abs(boxes[2].y-boxes[0].y)<1,'Cards fill down each column');
   assert.equal(await cards.first().getAttribute('data-formation-hero'),'orion');
   assert.ok(await cards.first().locator('strong').evaluate(element=>parseFloat(getComputedStyle(element).fontSize))>=20);
   await page.screenshot({path:fileURLToPath(new URL(`team-empty-${width}.png`,directory))});
   const firstBox=await cards.first().boundingBox();
   await page.mouse.move(firstBox.x+firstBox.width/2,firstBox.y+firstBox.height/2);await page.mouse.down();
   await page.getByRole('dialog',{name:'Орион',exact:true}).waitFor();await page.mouse.up();
   await page.getByRole('button',{name:'Закрыть героя',exact:true}).click();
   assert.equal(await team.locator('.ab-field-slot[data-formation-hero]').count(),0,'Hold does not assign a hero');
   await cards.first().click();assert.equal(await team.locator('[data-formation-slot="0"]').getAttribute('data-formation-hero'),'orion');
   await team.getByRole('button',{name:'По уровню'}).click();assert.equal(await cards.first().getAttribute('data-formation-hero'),'bastion');
   await team.getByRole('button',{name:'По редкости'}).click();assert.equal(await cards.first().getAttribute('data-formation-hero'),'orion');
   await team.getByRole('button',{name:'Эпические',exact:true}).click();assert.equal(await cards.count(),1);assert.equal(await cards.first().getAttribute('data-formation-hero'),'ruta');
   await team.getByRole('button',{name:'Эпические',exact:true}).click();
   async function drag(source,target){const a=await source.boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();}
   const slot=team.locator('[data-formation-slot="0"]');
   await drag(slot,team.locator('.ab-roster-tools'));assert.equal(await slot.getAttribute('data-formation-hero'),null);
   for(let i=0;i<5;i++){await drag(cards.nth(i),team.locator(`[data-formation-slot="${i}"]`));}
   assert.equal(await team.locator('.ab-field-slot[data-formation-hero]').count(),5,'Drag assigns without opening details');
   await drag(cards.first(),team.locator('.ab-roster-tools'));
   assert.equal(await team.locator('.ab-field-slot[data-formation-hero]').count(),5,'Moving a roster card within the roster does not remove its assigned hero');
   assert.equal(await page.getByRole('dialog').count(),0);
   const field=await slot.boundingBox(),point={x:field.x+field.width/2,y:field.y+field.height/2};
   if(width===390){const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.getByRole('dialog').waitFor();await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
   else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.getByRole('dialog').waitFor();await page.mouse.up();}
   await page.getByRole('button',{name:'Закрыть героя',exact:true}).click();
   await team.getByRole('button',{name:'Сохранить',exact:true}).click();await team.getByText('Состав сохранён',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
   const clipped=await team.evaluate(root=>[...root.querySelectorAll('button,small,strong,.ab-unit-level')].filter(element=>element.checkVisibility()).filter(element=>{const r=element.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1;}).map(element=>element.textContent));
   assert.deepEqual(clipped,[],`${width}: visible controls and labels fit`);
   const overlaps=await team.locator('.ab-field-slot').evaluateAll(slots=>slots.flatMap((slot,index)=>[...slot.querySelectorAll('small,.ab-unit-level')].flatMap(label=>slots.slice(index+1).flatMap(other=>[...other.querySelectorAll('small,.ab-unit-level')].filter(next=>{const a=label.getBoundingClientRect(),b=next.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(next=>`${label.textContent}/${next.textContent}`)))));
   assert.deepEqual(overlaps,[],`${width}: different heroes' labels do not overlap`);
   await page.screenshot({path:fileURLToPath(new URL(`team-filled-${width}.png`,directory))});
   assert.deepEqual(errors,[]);console.log(`Team: two rows, larger text, sorting, hold, drag and save passed ${width}×${height}`);
  }catch(error){await page.screenshot({path:fileURLToPath(new URL(`team-failure-${width}.png`,directory))});throw error;}finally{await page.close();}
 }
}
