import {expect,it} from 'vitest';
import {attackPose,battleFrame,wavePresentation,actorAction,spreadPortraitFormation,marchingFormation} from './combatPresentation';
import {simulateCampaign} from '@/lib/autobattler/campaign';
import {starter} from '@/lib/autobattler/catalog';

it('peaks at impact, winds up before it and returns to rest without depending on playback speed',()=>{
 for(const isCast of [false,true]){
  expect(attackPose(2000,2000,isCast)).toBe(1);
  expect(attackPose(1850,2000,isCast)).toBeLessThan(0);
  expect(attackPose(1000,2000,isCast)).toBe(0);
  expect(attackPose(3000,2000,isCast)).toBe(0);
  expect(attackPose(1999.99,2000,isCast)).toBeCloseTo(1,5);
  expect(attackPose(2000.01,2000,isCast)).toBeCloseTo(1,5);
 }
});
it('changes health on the damage event rather than the next 200ms snapshot',()=>{
 const battle=simulateCampaign(starter,starter,42,.2);
 const event=battle.events.find(event=>event.kind==='damage'&&event.amount>0&&event.time%200!==0)!;
 const before=battleFrame(battle,event.time-.01).units.find(unit=>unit.id===event.target)!;
 const after=battleFrame(battle,event.time).units.find(unit=>unit.id===event.target)!;
 expect(before.hp).toBeGreaterThan(after.hp);expect(after.hp).toBe(event.health);
 expect(actorAction(battle.events,event.actor,event.time).attack).toBe(1);
});
it('keeps the same authoritative survivors while presenting the march and final boss',()=>{
 const battle=simulateCampaign(starter,starter,42,.2),original=JSON.stringify(battle);
 const middle=(battle.waves![0].end+battle.waves![1].start)/2;
 expect(wavePresentation(battle,middle)).toMatchObject({index:0,isMarching:true,isBoss:false});
 const end=wavePresentation(battle,battle.waves![2].start);
 expect(end).toMatchObject({index:2,isBoss:true,isMarching:false,count:3});
 expect(battle.frames[0].units.find(unit=>unit.id===end.bossId)?.side).toBe(1);
 for(let time=0;time<battle.duration;time+=31){const frame=battleFrame(battle,time);spreadPortraitFormation(frame.units,540,800);wavePresentation(battle,time);marchingFormation(frame.units,.5);}
 expect(JSON.stringify(battle)).toBe(original);
});
it('shows second-wave shields for their actual duration on the global replay clock',()=>{
 const battle=simulateCampaign(starter,starter,42,.2),start=battle.waves![1].start;
 const frame=battle.frames.find(frame=>frame.time>=start&&frame.time<battle.waves![1].end&&frame.units.some(unit=>unit.shield>0&&unit.shieldUntil>frame.time-start))!;
 expect(frame).toBeDefined();
 const unit=frame.units.find(unit=>unit.shield>0&&unit.shieldUntil>frame.time-start)!;
 const displayed=battleFrame(battle,frame.time).units.find(other=>other.id===unit.id)!;
 expect(displayed.shieldUntil).toBe(unit.shieldUntil+start);
 expect(displayed.shieldUntil).toBeGreaterThan(frame.time);
});
