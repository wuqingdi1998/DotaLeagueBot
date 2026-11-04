import {describe,it,expect} from 'vitest';
import {heroes,starter,stages,rules} from './catalog';
import {simulate} from './simulation';
import {newProfile,summon,rewardStage,validateTeam} from './progression';
import {adminChange} from './admin';
describe('authoritative autobattler',()=>{
  it('has five distinct heroes, rarity budgets and 15 stages',()=>{
    expect(new Set(heroes.map(hero=>hero.id)).size).toBe(5);
    expect(['Rare','Epic','Legendary'].map(rarity=>heroes.filter(hero=>hero.rarity===rarity).length)).toEqual([2,1,2]);
    expect(stages).toHaveLength(15);
    for(const stage of stages){expect(stage.team).toHaveLength(5);expect(stage.team.every(id=>heroes.some(hero=>hero.id===id))).toBe(true);}
  });
  it('replays a deterministic real fight with motion, skills, healing and bounded duration',()=>{
    const first=simulate(['bastion','iskra','veya','sokol','mirra'],['bastion','iskra','veya','sokol','mirra'],42);expect(first).toEqual(simulate(['bastion','iskra','veya','sokol','mirra'],['bastion','iskra','veya','sokol','mirra'],42));
    expect(first.duration).toBeLessThanOrEqual(rules.limit);expect(first.duration).toBeGreaterThan(10000);
    expect(first.frames.at(-1)?.units).toEqual(first.units);
    expect(first.events.some(event=>event.kind==='heal')).toBe(true);
    expect(first.events.some(event=>event.kind==='skill')).toBe(true);
    expect(first.frames[30].units[0].x).not.toBe(first.frames[0].units[0].x);
    expect(first.frames.some(frame=>frame.units.some(unit=>unit.shield>0))).toBe(true);
    expect(first.frames.some(frame=>frame.units.some(unit=>unit.stunnedUntil>frame.time))).toBe(true);
  });
  it('computes victory and defeat from health, never a random result',()=>{
    expect(simulate(starter,starter,1,.4).winner).toBe(0);
    expect(simulate(starter,starter,1,3).winner).toBe(1);
  });
  it('runs balance compositions without invalid positions, resurrection or endless battles',()=>{
    const teams=[starter,['veya','ruta','astra','flor','bastion'],['granit','bor','mirra','morok','echo'],['orion','selena','astra','flor','taiga'],['ten','zefir','nox','lira','sokol']];
    for(const left of teams)for(const right of teams){
      const battle=simulate(left,right,21);expect(battle.duration).toBeLessThanOrEqual(90000);
      for(const unit of battle.units){expect(Number.isFinite(unit.hp)).toBe(true);expect(unit.x).toBeGreaterThanOrEqual(40);expect(unit.x).toBeLessThanOrEqual(960);}
      for(const unit of battle.units){const death=battle.frames.find(frame=>frame.units.find(other=>other.id===unit.id)!.hp===0);if(death){expect(battle.frames.filter(frame=>frame.time>=death.time).every(frame=>frame.units.find(other=>other.id===unit.id)!.hp===0)).toBe(true);expect(battle.events.filter(event=>event.actor===unit.id&&event.kind==='skill'&&event.time>death.time)).toHaveLength(0);}}
    }
  });
  it('charges independent shards and uses exact rarity boundaries without hidden guarantees',()=>{
    const profile=newProfile();profile.goldenShards=2;profile.epic=99;profile.legendary=99;
    for(const [roll,rarity] of [[0,'Rare'],[.889,'Rare'],[.89,'Epic'],[.989,'Epic'],[.99,'Legendary']] as const){
      const [id]=summon(profile,1,()=>roll);expect(heroes.find(hero=>hero.id===id)?.rarity).toBe(rarity);
    }
    expect(profile.tickets).toBe(5);
    for(const [roll,rarity] of [[.799,'Epic'],[.8,'Legendary']] as const){const [id]=summon(profile,1,()=>roll,undefined,'gold');expect(heroes.find(hero=>hero.id===id)?.rarity).toBe(rarity);}
    expect(profile.goldenShards).toBe(0);expect(profile.tickets).toBe(5);
    expect(()=>summon(profile,1,()=>0,undefined,'gold')).toThrow();expect(()=>summon(profile,-1,()=>0)).toThrow();expect(()=>summon(profile,1,()=>0,undefined,'fake')).toThrow();
  });
  it('measures the specified blue shard rates over 100000 rolls',()=>{
    const profile=newProfile();profile.tickets=100000;let state=19;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    for(let i=0;i<10000;i++)summon(profile,10,random);
    const legendary=profile.summons.filter(entry=>heroes.find(hero=>hero.id===entry.hero)?.rarity==='Legendary').length;
    const epic=profile.summons.filter(entry=>heroes.find(hero=>hero.id===entry.hero)?.rarity==='Epic').length;
    expect(legendary).toBeGreaterThan(850);expect(legendary).toBeLessThan(1150);expect(epic).toBeGreaterThan(9500);expect(epic).toBeLessThan(10500);
  });
  it('awards a stage once and validates ownership and duplicate slots',()=>{
    const profile=newProfile();expect(rewardStage(profile,1,false)).toBe(0);expect(rewardStage(profile,1,true)).toBe(2);expect(rewardStage(profile,1,true)).toBe(0);expect(profile.unlocked).toBe(2);
    expect(()=>validateTeam(profile,starter)).not.toThrow();expect(()=>validateTeam(profile,Array(5).fill('bastion'))).toThrow();expect(()=>validateTeam(profile,['veya',...starter.slice(1)])).toThrow();
    adminChange(profile,{command:'remove',hero:'iskra'});expect(profile.team).toEqual(['bastion',null,'ruta','orion','selena']);
    adminChange(profile,{command:'campaign'});expect(profile.cleared).toEqual([]);expect(profile.unlocked).toBe(1);
    expect(()=>adminChange(profile,{command:'reset'})).toThrow();
  });
});
