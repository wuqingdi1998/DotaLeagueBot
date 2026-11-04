import {describe,it,expect} from 'vitest';
import {crystalFragments,transformFragment} from './crystalGeometry';
import {rotate} from './crystalMath';
import {ritualFrame} from './ritualFrame';

const distance=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
describe('summon solid geometry and continuous reveal',()=>{
 it('keeps metal and glass in the same parent coordinate system throughout a rotation',()=>{
  for(const yaw of [0,.7,1.8,3.2,5.6])for(const fragment of crystalFragments){
   const posed=transformFragment(fragment,yaw,.08,0,0);
   for(let index=0;index<posed.length;index++)expect(distance(posed[index],rotate(fragment.vertices[index],yaw,.08))).toBeLessThan(1e-12);
  }
 });
 it('fractures into closed volumes which move apart and tumble without stretching',()=>{
  const glass=crystalFragments.filter(fragment=>fragment.material==='glass');
  expect(glass.length).toBeGreaterThan(30);
  for(const fragment of crystalFragments){
   if(fragment.material==='glass'){expect(fragment.vertices).toHaveLength(4);expect(fragment.faces).toHaveLength(4);}
   const rest=transformFragment(fragment,.6,.1,0,0),burst=transformFragment(fragment,.6,.1,.038,.8);
   expect(distance(rest[0],burst[0])).toBeGreaterThan(.12);
   for(let index=1;index<burst.length;index++)expect(distance(burst[0],burst[index])).toBeCloseTo(distance(rest[0],rest[index]),10);
  }
 });
 it('starts with neutral light, introduces rarity smoothly and separates before releasing fragments',()=>{
  for(const rarity of ['Rare','Epic','Legendary'] as const){
   const before=ritualFrame('charge',1,'blue',rarity),start=ritualFrame('opening',0,'blue',rarity);
   expect(start.energy).toBe(before.energy);expect(start.rarityBlend).toBe(0);expect(start.burst).toBe(0);
   expect(ritualFrame('opening',.1,'blue',rarity).rarityBlend).toBe(0);
   expect(ritualFrame('opening',.4,'blue',rarity).rarityBlend).toBeGreaterThan(0);
   expect(ritualFrame('opening',.5,'blue',rarity).separation).toBeGreaterThan(0);
   expect(ritualFrame('opening',.5,'blue',rarity).burst).toBe(0);
   expect(ritualFrame('opening',.85,'blue',rarity).burst).toBeGreaterThan(.5);
   for(let index=1;index<=100;index++){
    const prior=ritualFrame('opening',(index-1)/100,'blue',rarity);
    const next=ritualFrame('opening',index/100,'blue',rarity);
    expect(Math.abs(next.rarityBlend-prior.rarityBlend)).toBeLessThan(.04);
   }
  }
 });
});
