import {it,expect} from 'vitest';
import {simulateCampaign} from './campaign';
import {simulate} from './simulation';
import {starter,heroById} from './catalog';
import {heroStats} from './abilities';
import {newProfile,rewardStage} from './progression';

it('plays three waves with deterministic survivors and a walking interval',()=>{
 const battle=simulateCampaign(starter,starter,42,.2);
 expect(battle).toEqual(simulateCampaign(starter,starter,42,.2));
 expect(battle.waves).toHaveLength(3);expect(battle.winner).toBe(0);
 for(let index=1;index<3;index++){
  const previous=battle.frames.find(frame=>frame.time===battle.waves![index-1].end)!;
  const next=battle.frames.find(frame=>frame.time===battle.waves![index].start)!;
  expect(next.time-previous.time).toBeGreaterThanOrEqual(3200);
  expect(next.units.slice(0,5).map(unit=>[unit.hp,unit.energy])).toEqual(previous.units.slice(0,5).map(unit=>[unit.hp,unit.energy]));
 }
 expect(battle.frames.at(-1)?.units).toEqual(battle.units);
 for(let index=1;index<battle.frames.length;index++)expect(battle.frames[index].time).toBeGreaterThan(battle.frames[index-1].time);
 expect(simulateCampaign(starter,starter,42,5).waves).toHaveLength(1);
});
it('does not apply unconditional legendary stat bonuses',()=>{
 const team=['orion','selena',...starter.slice(2)];
 const battle=simulate(team,starter,42);
 for(const unit of battle.frames[0].units){
  const base=heroStats(heroById[unit.hero]);
  expect(unit.defense).toBeCloseTo(base.defense);
  expect(unit.interval).toBeCloseTo(base.interval);
 }
 expect(heroStats(heroById.orion).defense).toBe(heroById.orion.defense);
 expect(heroStats(heroById.selena).interval).toBe(heroById.selena.interval);
});
it('grants one golden shard only on the first chapter victory',()=>{
 const profile=newProfile();rewardStage(profile,5,false);expect(profile.goldenShards).toBe(0);
 rewardStage(profile,5,true);rewardStage(profile,5,true);expect(profile.goldenShards).toBe(1);
});
